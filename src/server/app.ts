import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import { loadConfig, type ServerConfig } from './config';
import { DataStore, ValidationError } from './store';
import { DATA_NAMES, type DataName } from './schemas';
import { CSRF_HEADER, SessionStore, checkCsrf, safeEqual, verifyPassword } from './auth';
import { DAY, DK_TZ, dkMidnight, zonedParts } from '../shared/time';
import { isDoorUnlocked } from '../shared/season';
import {
  buildChristmasFlight,
  buildSchedule,
  flightDistanceKm,
  flightEnd,
  flightRng,
  flightStart,
  parseDkLocal,
  type TrackingConfig,
} from '../shared/tracking';

export interface AppOptions {
  config?: Partial<ServerConfig>;
  logger?: boolean;
}

const COOKIE_DEV = 'nk_admin';
const COOKIE_PROD = '__Host-nk_admin';

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const cfg = loadConfig(opts.config);
  const app = Fastify({
    logger: opts.logger === false ? false : { level: cfg.isProd ? 'info' : 'debug' },
    // Apache er eneste proxy foran: stol kun på det sidste hop.
    trustProxy: (_addr: string, hop: number) => hop < 1,
    bodyLimit: 2 * 1024 * 1024,
    disableRequestLogging: cfg.isProd,
  });

  const store = new DataStore(cfg.dataDir, app.log);
  await store.init();
  await fsp.mkdir(path.join(cfg.mediaDir, 'videos'), { recursive: true });

  const sessions = new SessionStore(cfg.sessionHours * 3600_000);
  const cookieName = cfg.cookieSecure ? COOKIE_PROD : COOKIE_DEV;
  if (!cfg.adminPasswordHash) {
    app.log.warn('ADMIN_PASSWORD_HASH er ikke sat – administration er slået fra.');
  }

  await app.register(fastifyCookie);
  await app.register(fastifyRateLimit, { global: true, max: 600, timeWindow: '1 minute' });
  await app.register(fastifyMultipart, {
    limits: { fileSize: cfg.maxUploadMb * 1024 * 1024, files: 1, fields: 5 },
  });

  /* ---------------- sikkerhedsheaders ---------------- */

  const mediaExtra = cfg.extraMediaSrc ? ` ${cfg.extraMediaSrc}` : '';
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://tiles.openfreemap.org",
    "font-src 'self' data:",
    "connect-src 'self' https://tiles.openfreemap.org" + mediaExtra,
    "media-src 'self' blob:" + mediaExtra,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('Content-Security-Policy', csp);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');
    if (_req.url.startsWith('/admin') || _req.url.startsWith('/api/admin')) reply.header('X-Robots-Tag', 'noindex, nofollow');
    return payload;
  });

  /* ---------------- hjælpere ---------------- */

  const isAdmin = (req: FastifyRequest) => !!sessions.get(req.cookies[cookieName]);

  /** Tidsmaskine: ?t=<ms|ISO> – kun for admin (eller alle i udvikling). */
  function nowFor(req: FastifyRequest): { now: number; active: boolean; allowed: boolean } {
    const allowed = cfg.timeMachineForAll || isAdmin(req);
    const q = (req.query as Record<string, string | undefined>)?.t;
    if (allowed && q) {
      const n = /^\d+$/.test(q) ? Number(q) : Date.parse(q);
      if (Number.isFinite(n) && n > Date.UTC(2000, 0, 1) && n < Date.UTC(2200, 0, 1)) {
        return { now: n, active: true, allowed };
      }
    }
    return { now: Date.now(), active: false, allowed };
  }

  const safeParse = (s: string | undefined) => {
    if (!s) return null;
    try {
      return parseDkLocal(s);
    } catch {
      return null;
    }
  };

  function activeEvents(now: number) {
    return store
      .get('events')
      .events.filter((e) => e.enabled)
      .map((e) => ({ ...e, startMs: safeParse(e.start) ?? 0, endMs: safeParse(e.end) ?? 0 }))
      .filter((e) => e.startMs <= now && e.endMs >= now);
  }

  function groundedRanges(): [number, number][] {
    return store
      .get('events')
      .events.filter((e) => e.enabled && e.type === 'grounded')
      .map((e) => [safeParse(e.start) ?? 0, safeParse(e.end) ?? 0] as [number, number]);
  }

  function activeMessages(now: number) {
    return store.get('status').messages.filter((m) => {
      const s = safeParse(m.start);
      const e = safeParse(m.end);
      return (s === null || s <= now) && (e === null || e >= now);
    });
  }

  const noStore = (reply: FastifyReply) => reply.header('Cache-Control', 'no-store');

  /* ---------------- offentlige API'er ---------------- */

  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/time', async (req, reply) => {
    noStore(reply);
    const t = nowFor(req);
    return { now: t.now, serverNow: Date.now(), tz: DK_TZ, timeMachine: { allowed: t.allowed, active: t.active } };
  });

  app.get('/api/bootstrap', async (req, reply) => {
    noStore(reply);
    const t = nowFor(req);
    const status = store.get('status');
    return {
      now: t.now,
      serverNow: Date.now(),
      tz: DK_TZ,
      timeMachine: { allowed: t.allowed, active: t.active },
      site: store.get('site'),
      events: activeEvents(t.now),
      status: { overrides: status.overrides, messages: activeMessages(t.now) },
      cameras: store.get('cameras').cameras,
      homeBase: store.get('tracking').homeBase,
    };
  });

  app.get('/api/tracking', async (req, reply) => {
    noStore(reply);
    const { now } = nowFor(req);
    const tcfg = store.get('tracking') as TrackingConfig;
    const flights = buildSchedule(tcfg, now - 2 * DAY, now + 5 * DAY, { groundedRanges: groundedRanges() });
    return { now, homeBase: tcfg.homeBase, flights };
  });

  app.get('/api/journal', async (req, reply) => {
    noStore(reply);
    const { now } = nowFor(req);
    const p = zonedParts(now, DK_TZ);
    const seasonYear = p.month >= 10 ? p.year : p.year - 1;
    const from = dkMidnight(seasonYear, 10, 1);
    const tcfg = store.get('tracking') as TrackingConfig;
    const conditions = [
      'Meder blankpolerede, bjælder stemt',
      'Lidt sne i gavesækken – rystet ud efter landing',
      'Rudolfs røde næse fik nyt batteri',
      'Sædevarmen kørte på fuld styrke',
      'En enkelt løs skrue – fastspændt af Pjok',
      'Perfekt stand – nisserne er stolte',
      'Lidt glasur på styret fra en pebernød',
    ];
    const flights = buildSchedule(tcfg, from, now, { groundedRanges: groundedRanges() })
      .filter((f) => flightStart(f) <= now)
      .map((f) => {
        const r = flightRng(f);
        return {
          id: f.id,
          type: f.type,
          title: f.title,
          description: f.description,
          start: flightStart(f),
          end: flightEnd(f),
          inProgress: flightEnd(f) > now,
          distanceKm: Math.round(flightDistanceKm(f)),
          stops: f.stops.filter((s) => s.kind === 'city').map((s) => s.name),
          condition: conditions[Math.floor(r() * conditions.length)],
          landingScore: (8 + r() * 2).toFixed(1),
        };
      })
      .reverse();
    return { now, flights };
  });

  app.get('/api/calendar', async (req, reply) => {
    noStore(reply);
    const { now } = nowFor(req);
    // Låger åbnes på serveren: indhold fra fremtidige låger sendes aldrig.
    const doors = store
      .get('calendar')
      .doors.slice()
      .sort((a, b) => a.day - b.day)
      .map((d) => (isDoorUnlocked(d.day, now) ? { ...d, locked: false } : { day: d.day, locked: true }));
    return { now, doors };
  });

  /* ---------------- administration ---------------- */

  app.post(
    '/api/admin/login',
    { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } },
    async (req, reply) => {
      if (!checkCsrf(req, reply)) return;
      noStore(reply);
      if (!cfg.adminPasswordHash) return reply.code(503).send({ error: 'Administration er ikke konfigureret' });
      const body = (req.body ?? {}) as { username?: unknown; password?: unknown };
      const username = typeof body.username === 'string' ? body.username.slice(0, 100) : '';
      const password = typeof body.password === 'string' ? body.password.slice(0, 500) : '';
      const userOk = safeEqual(username, cfg.adminUser);
      const pwOk = await verifyPassword(password, cfg.adminPasswordHash);
      if (!userOk || !pwOk) {
        req.log.warn({ ip: req.ip }, 'Mislykket admin-login');
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
        return reply.code(401).send({ error: 'Forkert brugernavn eller adgangskode' });
      }
      const token = sessions.create(username);
      reply.setCookie(cookieName, token, {
        httpOnly: true,
        secure: cfg.cookieSecure,
        sameSite: 'strict',
        path: '/',
        maxAge: cfg.sessionHours * 3600,
      });
      req.log.info({ ip: req.ip }, 'Admin logget ind');
      return { ok: true, user: username };
    },
  );

  // Alt under /api/admin (undtagen login) kræver gyldig session + CSRF-tjek.
  app.register(async (admin) => {
    admin.addHook('onRequest', async (req, reply) => {
      noStore(reply);
      if (req.url.startsWith('/api/admin/login')) return;
      if (!isAdmin(req)) return reply.code(401).send({ error: 'Log ind for at fortsætte' });
      if (!checkCsrf(req, reply)) return reply;
    });

    admin.post('/api/admin/logout', async (req, reply) => {
      sessions.destroy(req.cookies[cookieName]);
      reply.clearCookie(cookieName, { path: '/' });
      return { ok: true };
    });

    admin.get('/api/admin/me', async () => ({ ok: true, user: cfg.adminUser, csrfHeader: CSRF_HEADER }));

    admin.get<{ Params: { name: string } }>('/api/admin/data/:name', async (req, reply) => {
      const name = req.params.name as DataName;
      if (!DATA_NAMES.includes(name)) return reply.code(404).send({ error: 'Ukendt datafil' });
      return store.get(name);
    });

    admin.put<{ Params: { name: string } }>('/api/admin/data/:name', async (req, reply) => {
      const name = req.params.name as DataName;
      if (!DATA_NAMES.includes(name)) return reply.code(404).send({ error: 'Ukendt datafil' });
      try {
        const saved = await store.set(name, req.body);
        req.log.info({ name }, 'Datafil opdateret af admin');
        return saved;
      } catch (e) {
        if (e instanceof ValidationError) return reply.code(422).send({ error: 'Ugyldige data', issues: e.issues });
        throw e;
      }
    });

    admin.get<{ Querystring: { year?: string } }>('/api/admin/preview/christmas', async (req) => {
      const year = Number(req.query.year) || zonedParts(Date.now(), DK_TZ).year;
      const tcfg = store.get('tracking') as TrackingConfig;
      const plan = buildChristmasFlight(tcfg, year);
      const tzOf = new Map(tcfg.christmas.cities.map((c) => [c.name, c.tz ?? DK_TZ]));
      return {
        year,
        stops: (plan?.stops ?? []).map((s) => {
          const tz = s.kind === 'base' ? 'UTC' : tzOf.get(s.name) ?? DK_TZ;
          const lp = zonedParts(s.arrive, tz);
          const dp = zonedParts(s.arrive, DK_TZ);
          const f = (p: { hour: number; minute: number }) => `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
          return { name: s.name, country: s.country, kind: s.kind, arrive: s.arrive, local: `${lp.day}/12 ${f(lp)}`, dk: `${dp.day}/${dp.month} ${f(dp)}`, tz };
        }),
      };
    });

    /* ----- medier ----- */

    const videosDir = path.join(cfg.mediaDir, 'videos');
    const ALLOWED = new Set(['.mp4', '.m4v', '.webm', '.jpg', '.jpeg', '.png', '.webp']);

    admin.get('/api/admin/media', async () => {
      const files = await fsp.readdir(videosDir, { withFileTypes: true });
      const list = await Promise.all(
        files
          .filter((f) => f.isFile() && !f.name.startsWith('.'))
          .map(async (f) => {
            const st = await fsp.stat(path.join(videosDir, f.name));
            return { name: f.name, url: `/media/videos/${encodeURIComponent(f.name)}`, size: st.size, modified: st.mtimeMs };
          }),
      );
      return { files: list.sort((a, b) => b.modified - a.modified) };
    });

    admin.post('/api/admin/media', async (req, reply) => {
      const file = await req.file();
      if (!file) return reply.code(400).send({ error: 'Ingen fil modtaget' });
      const ext = path.extname(file.filename).toLowerCase();
      if (!ALLOWED.has(ext)) {
        file.file.resume();
        return reply.code(415).send({ error: 'Kun mp4, m4v, webm, jpg, png og webp er tilladt' });
      }
      const base = sanitizeName(path.basename(file.filename, ext)) || 'video';
      let name = `${base}${ext}`;
      for (let i = 2; fs.existsSync(path.join(videosDir, name)); i++) name = `${base}-${i}${ext}`;
      const tmp = path.join(videosDir, `.upload-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      try {
        await pipeline(file.file, fs.createWriteStream(tmp, { mode: 0o644 }));
        if (file.file.truncated) throw new UploadError(413, `Filen er større end ${cfg.maxUploadMb} MB`);
        if (!(await looksLike(tmp, ext))) throw new UploadError(415, 'Filens indhold passer ikke til filtypen');
        await fsp.rename(tmp, path.join(videosDir, name));
      } catch (e) {
        await fsp.rm(tmp, { force: true });
        if (e instanceof UploadError) return reply.code(e.status).send({ error: e.message });
        throw e;
      }
      req.log.info({ name }, 'Mediefil uploadet');
      return { ok: true, name, url: `/media/videos/${encodeURIComponent(name)}` };
    });

    admin.delete<{ Params: { file: string } }>('/api/admin/media/:file', async (req, reply) => {
      const name = req.params.file;
      if (!/^[a-z0-9][a-z0-9._-]{0,120}$/i.test(name) || name.includes('..')) {
        return reply.code(400).send({ error: 'Ugyldigt filnavn' });
      }
      const full = path.join(videosDir, name);
      if (path.dirname(full) !== videosDir) return reply.code(400).send({ error: 'Ugyldigt filnavn' });
      await fsp.rm(full, { force: true });
      return { ok: true };
    });
  });

  /* ---------------- statiske filer ---------------- */

  // /media serveres normalt direkte af Apache; dette er en reserve (og til udvikling).
  await app.register(fastifyStatic, {
    root: cfg.mediaDir,
    prefix: '/media/',
    decorateReply: false,
    index: false,
    dotfiles: 'deny',
    maxAge: '1h',
  });

  const hasWeb = fs.existsSync(path.join(cfg.webDir, 'index.html'));
  if (hasWeb) {
    await app.register(fastifyStatic, {
      root: cfg.webDir,
      prefix: '/',
      index: false,
      wildcard: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.header('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.header('Cache-Control', 'public, max-age=3600');
        }
      },
    });
  }

  const indexHtml = hasWeb ? fs.readFileSync(path.join(cfg.webDir, 'index.html'), 'utf8') : null;

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/media/') || (req.method !== 'GET' && req.method !== 'HEAD')) {
      return reply.code(404).send({ error: 'Ikke fundet' });
    }
    if (!indexHtml) return reply.code(404).type('text/plain').send('Frontend er ikke bygget (kør npm run build).');
    // SPA: alle sider deler samme index.html, routing sker i browseren.
    return reply.type('text/html; charset=utf-8').header('Cache-Control', 'no-cache').send(indexHtml);
  });

  app.setErrorHandler((err, req, reply) => {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    reply.code(status).send({ error: status >= 500 ? 'Der skete en fejl på Nordpolen. Prøv igen om lidt.' : (err as Error).message });
  });

  return app;
}

class UploadError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function sanitizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Tjekker "magiske bytes", så fx et script ikke kan uploades som .mp4. */
async function looksLike(file: string, ext: string): Promise<boolean> {
  const fh = await fsp.open(file, 'r');
  try {
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    switch (ext) {
      case '.mp4':
      case '.m4v':
        return buf.subarray(4, 8).toString('latin1') === 'ftyp';
      case '.webm':
        return buf.readUInt32BE(0) === 0x1a45dfa3;
      case '.jpg':
      case '.jpeg':
        return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      case '.png':
        return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      case '.webp':
        return buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
      default:
        return false;
    }
  } finally {
    await fh.close();
  }
}
