import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server/app';
import { hashPassword, verifyPassword } from '../src/server/auth';

const PASSWORD = 'rensdyr-og-risengrød-2026';
let app: FastifyInstance;
let tmp: string;

const json = (body: unknown) => ({
  headers: { 'content-type': 'application/json', 'x-nordpolen': '1' },
  payload: JSON.stringify(body),
});

let cached: string | null = null;
async function login(fresh = false): Promise<string> {
  if (cached && !fresh) return cached;
  const res = await app.inject({ method: 'POST', url: '/api/admin/login', ...json({ username: 'julemanden', password: PASSWORD }) });
  expect(res.statusCode).toBe(200);
  const c = res.cookies.find((x) => x.name === 'nk_admin')!;
  expect(c.httpOnly).toBe(true);
  expect(c.sameSite).toBe('Strict');
  cached = `nk_admin=${c.value}`;
  return cached;
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nordpolen-test-'));
  app = await buildApp({
    logger: false,
    config: {
      dataDir: path.join(tmp, 'data'),
      mediaDir: path.join(tmp, 'media'),
      webDir: path.join(tmp, 'web-missing'),
      adminPasswordHash: await hashPassword(PASSWORD, 2 ** 14),
      cookieSecure: false,
      timeMachineForAll: false,
    },
  });
});

afterAll(async () => {
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('adgangskoder', () => {
  it('verificerer scrypt-hashes', async () => {
    const h = await hashPassword('hemmelig-kakao', 2 ** 14);
    expect(await verifyPassword('hemmelig-kakao', h)).toBe(true);
    expect(await verifyPassword('forkert', h)).toBe(false);
    expect(await verifyPassword('x', 'noget-andet')).toBe(false);
  });
});

describe('offentlige API’er', () => {
  it('opretter datafiler fra standardværdier', () => {
    for (const n of ['site', 'cameras', 'tracking', 'status', 'events', 'calendar']) {
      expect(fs.existsSync(path.join(tmp, 'data', `${n}.json`))).toBe(true);
    }
  });

  it('sender sikkerhedsheaders', async () => {
    const res = await app.inject('/api/health');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('bootstrap indeholder site, kameraer og tid', async () => {
    const res = await app.inject('/api/bootstrap');
    const b = res.json();
    expect(b.site.title).toBe('Nordpolens Kontrolcentral');
    expect(b.cameras).toHaveLength(8);
    expect(Math.abs(b.now - Date.now())).toBeLessThan(5000);
  });

  it('ignorerer tidsmaskinen for almindelige besøgende', async () => {
    const res = await app.inject('/api/time?t=2026-12-24T18:00:00Z');
    expect(res.json().timeMachine.active).toBe(false);
  });

  it('sender aldrig indhold fra lukkede låger', async () => {
    const res = await app.inject('/api/calendar');
    const doors = res.json().doors as { day: number; locked: boolean; title?: string; body?: string }[];
    expect(doors).toHaveLength(24);
    // i testen kan dato variere – lukkede låger må aldrig have indhold
    for (const d of doors.filter((x) => x.locked)) {
      expect(d.title).toBeUndefined();
      expect(d.body).toBeUndefined();
    }
  });

  it('returnerer flyveplan og flyvejournal', async () => {
    const t = await app.inject('/api/tracking');
    expect(Array.isArray(t.json().flights)).toBe(true);
    const j = await app.inject('/api/journal');
    expect(Array.isArray(j.json().flights)).toBe(true);
  });

  it('giver 404 for ukendte API-ruter og frontend-hint uden build', async () => {
    expect((await app.inject('/api/findes-ikke')).statusCode).toBe(404);
    expect((await app.inject('/nvr')).statusCode).toBe(404);
  });

  it('svarer på HEAD for sider (SPA-fallback)', async () => {
    const res = await app.inject({ method: 'HEAD', url: '/overvaagning' });
    // uden bygget frontend giver fallback 404 med forklaring – men aldrig 405/500
    expect([200, 404]).toContain(res.statusCode);
  });

  it('afviser stitraversering i /media', async () => {
    const res = await app.inject('/media/../data/site.json');
    expect([400, 403, 404]).toContain(res.statusCode);
    expect(res.body).not.toContain('heroTitle');
  });
});

describe('administration', () => {
  it('kræver login for alle admin-ruter', async () => {
    for (const [method, url] of [
      ['GET', '/api/admin/me'],
      ['GET', '/api/admin/data/site'],
      ['PUT', '/api/admin/data/site'],
      ['GET', '/api/admin/media'],
      ['POST', '/api/admin/media'],
      ['DELETE', '/api/admin/media/x.mp4'],
    ] as const) {
      const res = await app.inject({ method, url, headers: { 'x-nordpolen': '1' } });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('afviser forkert adgangskode', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/admin/login', ...json({ username: 'julemanden', password: 'forkert' }) });
    expect(res.statusCode).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('afviser login uden CSRF-header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ username: 'julemanden', password: PASSWORD }),
    });
    expect(res.statusCode).toBe(403);
  });

  it('afviser ændringer fra fremmed oprindelse', async () => {
    const cookie = await login();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/data/status',
      headers: { cookie, 'content-type': 'application/json', 'x-nordpolen': '1', origin: 'https://ond.example', host: 'localhost' },
      payload: JSON.stringify({ overrides: {}, messages: [] }),
    });
    expect(res.statusCode).toBe(403);
  });

  it('validerer og gemmer data', async () => {
    const cookie = await login();
    const bad = await app.inject({ method: 'PUT', url: '/api/admin/data/status', ...json({ overrides: 5 }), headers: { ...json({}).headers, cookie } });
    expect(bad.statusCode).toBe(422);
    expect(bad.json().issues.length).toBeGreaterThan(0);

    const good = { overrides: { production: '42 %' }, messages: [{ id: 'test', text: '<script>alert(1)</script>', level: 'info' }] };
    const ok = await app.inject({ method: 'PUT', url: '/api/admin/data/status', payload: JSON.stringify(good), headers: { ...json({}).headers, cookie } });
    expect(ok.statusCode).toBe(200);
    const boot = (await app.inject('/api/bootstrap')).json();
    expect(boot.status.overrides.production).toBe('42 %');
    // Tekst gemmes som tekst – frontend viser den aldrig som HTML.
    expect(boot.status.messages[0].text).toBe('<script>alert(1)</script>');
    expect(fs.existsSync(path.join(tmp, 'data', 'status.prev.json'))).toBe(true);
  });

  it('afviser farlige video-URL’er', async () => {
    const cookie = await login();
    const cams = (await app.inject({ url: '/api/admin/data/cameras', headers: { cookie } })).json();
    cams.cameras[0].source = { type: 'mp4', url: 'javascript:alert(1)' };
    const res = await app.inject({ method: 'PUT', url: '/api/admin/data/cameras', payload: JSON.stringify(cams), headers: { ...json({}).headers, cookie } });
    expect(res.statusCode).toBe(422);
  });

  it('tillader tidsmaskine for admin', async () => {
    const cookie = await login();
    const res = await app.inject({ url: '/api/time?t=2026-12-24T18:00:00Z', headers: { cookie } });
    expect(res.json().timeMachine.active).toBe(true);
    expect(res.json().now).toBe(Date.parse('2026-12-24T18:00:00Z'));
    const cal = (await app.inject({ url: '/api/calendar?t=2026-12-10T12:00:00Z', headers: { cookie } })).json();
    expect(cal.doors.filter((d: { locked: boolean }) => !d.locked)).toHaveLength(10);
  });

  it('uploader kun gyldige videofiler', async () => {
    const cookie = await login();
    const boundary = '----nordpolen';
    const mk = (name: string, content: Buffer) =>
      Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
        content,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
    const headers = { cookie, 'x-nordpolen': '1', 'content-type': `multipart/form-data; boundary=${boundary}` };

    const fake = await app.inject({ method: 'POST', url: '/api/admin/media', headers, payload: mk('ond.mp4', Buffer.from('<?php echo 1; ?>')) });
    expect(fake.statusCode).toBe(415);

    const html = await app.inject({ method: 'POST', url: '/api/admin/media', headers, payload: mk('x.html', Buffer.from('<b>')) });
    expect(html.statusCode).toBe(415);

    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(64)]);
    const ok = await app.inject({ method: 'POST', url: '/api/admin/media', headers, payload: mk('../../Værksted Film!.mp4', mp4) });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().name).toBe('vaerksted-film.mp4');
    expect(fs.existsSync(path.join(tmp, 'media', 'videos', 'vaerksted-film.mp4'))).toBe(true);

    const list = (await app.inject({ url: '/api/admin/media', headers: { cookie } })).json();
    expect(list.files.map((f: { name: string }) => f.name)).toContain('vaerksted-film.mp4');

    const served = await app.inject({ url: '/media/videos/vaerksted-film.mp4', headers: { range: 'bytes=0-9' } });
    expect(served.statusCode).toBe(206);

    const del = await app.inject({ method: 'DELETE', url: '/api/admin/media/..%2Fdata', headers: { cookie, 'x-nordpolen': '1' } });
    expect(del.statusCode).toBe(400);
  });

  it('logger ud', async () => {
    const cookie = await login(true);
    await app.inject({ method: 'POST', url: '/api/admin/logout', headers: { cookie, 'x-nordpolen': '1' } });
    const res = await app.inject({ url: '/api/admin/me', headers: { cookie } });
    expect(res.statusCode).toBe(401);
  });

  it('rate-limiter login', async () => {
    let limited = false;
    for (let i = 0; i < 8; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/login',
        remoteAddress: '10.9.9.9',
        ...json({ username: 'x', password: 'y' }),
      });
      if (res.statusCode === 429) limited = true;
    }
    expect(limited).toBe(true);
  }, 20_000);
});
