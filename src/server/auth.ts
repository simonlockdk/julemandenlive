/**
 * Administratorlogin.
 *
 * - Adgangskoden gemmes kun som scrypt-hash (miljøvariabel ADMIN_PASSWORD_HASH).
 * - Sessioner holdes i hukommelsen; et genstart logger admin ud (bevidst enkelt).
 * - Cookien er HttpOnly, SameSite=Strict og Secure i produktion. Det er den
 *   eneste cookie på hele sitet, og den sættes kun for administratoren.
 * - Ændrende kald kræver desuden en særlig header og korrekt Origin (CSRF).
 */
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyReply, FastifyRequest } from 'fastify';

const scrypt = promisify(crypto.scrypt) as (
  pw: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  opts: crypto.ScryptOptions,
) => Promise<Buffer>;

const KEYLEN = 64;

export async function hashPassword(password: string, N = 2 ** 15, r = 8, p = 1): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r, p, maxmem: 256 * N * r });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nS, rS, pS, saltB64, keyB64] = parts as [string, string, string, string, string, string];
  const N = Number(nS);
  const r = Number(rS);
  const p = Number(pS);
  if (!Number.isInteger(N) || N < 2 ** 14 || N > 2 ** 20 || r < 1 || r > 32 || p < 1 || p > 16) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N,
    r,
    p,
    maxmem: 256 * N * r,
  });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

/** Sammenligner tekster uden at lække længde/indhold via timing. */
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

interface Session {
  user: string;
  expires: number;
}

export class SessionStore {
  private sessions = new Map<string, Session>();
  constructor(private ttlMs: number) {}

  create(user: string): string {
    this.sweep();
    const token = crypto.randomBytes(32).toString('base64url');
    this.sessions.set(this.key(token), { user, expires: Date.now() + this.ttlMs });
    return token;
  }

  get(token: string | undefined): Session | null {
    if (!token || token.length > 200) return null;
    const s = this.sessions.get(this.key(token));
    if (!s) return null;
    if (s.expires < Date.now()) {
      this.sessions.delete(this.key(token));
      return null;
    }
    return s;
  }

  destroy(token: string | undefined) {
    if (token) this.sessions.delete(this.key(token));
  }

  /** Tokens gemmes hashet, så et hukommelsesdump ikke afslører gyldige cookies. */
  private key(token: string) {
    return crypto.createHash('sha256').update(token).digest('base64url');
  }

  private sweep() {
    const now = Date.now();
    for (const [k, s] of this.sessions) if (s.expires < now) this.sessions.delete(k);
  }
}

export const CSRF_HEADER = 'x-nordpolen';

/** Afviser ændrende kald uden CSRF-header eller med fremmed Origin. */
export function checkCsrf(req: FastifyRequest, reply: FastifyReply): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  if (req.headers[CSRF_HEADER] !== '1') {
    reply.code(403).send({ error: 'Manglende sikkerhedsheader' });
    return false;
  }
  const origin = req.headers.origin;
  if (origin) {
    let host: string | null = null;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    const expected = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
    if (!host || host !== expected) {
      reply.code(403).send({ error: 'Ugyldig oprindelse' });
      return false;
    }
  }
  return true;
}
