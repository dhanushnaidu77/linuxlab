import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const SESSION_MS = 7 * 24 * 3600 * 1000;
const LOCK_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;

export function createAuth({ passwordHash, secret, now = Date.now }) {
  const cookieName = 'lab_session';
  // single-user console: lockout is global, not per-IP
  let fails = 0;
  let lockedUntil = 0;

  const sign = (payload) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');

  function attemptLogin(_ip, password) {
    if (now() < lockedUntil) return { ok: false, locked: true };
    if (!passwordHash || typeof password !== 'string' || !bcrypt.compareSync(password, passwordHash)) {
      if (++fails >= MAX_FAILS) { lockedUntil = now() + LOCK_MS; fails = 0; }
      return { ok: false, locked: now() < lockedUntil };
    }
    fails = 0;
    const payload = `v1.${now() + SESSION_MS}`;
    return { ok: true, token: `${payload}.${sign(payload)}`, maxAge: SESSION_MS };
  }

  function verifyCookie(header) {
    if (typeof header !== 'string') return false;
    const m = header.split(';').map((s) => s.trim()).find((s) => s.startsWith(cookieName + '='));
    if (!m) return false;
    const token = m.slice(cookieName.length + 1);
    const i = token.lastIndexOf('.');
    if (i < 0) return false;
    const payload = token.slice(0, i);
    const sig = Buffer.from(token.slice(i + 1));
    const want = Buffer.from(sign(payload));
    if (sig.length !== want.length || !crypto.timingSafeEqual(sig, want)) return false;
    const [ver, exp] = payload.split('.');
    return ver === 'v1' && Number(exp) > now();
  }

  return { attemptLogin, verifyCookie, cookieName };
}
