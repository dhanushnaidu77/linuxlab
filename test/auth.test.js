import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createAuth } from '../server/auth.js';

const hash = bcrypt.hashSync('hunter2', 4);
const mk = (clock) => createAuth({ passwordHash: hash, secret: 's3cret', now: () => clock.t });

test('correct password yields a cookie that verifies', () => {
  const clock = { t: 1_000_000 };
  const a = mk(clock);
  const r = a.attemptLogin('10.0.0.5', 'hunter2');
  assert.equal(r.ok, true);
  assert.equal(a.verifyCookie(`${a.cookieName}=${r.token}`), true);
  assert.equal(a.verifyCookie(`other=1; ${a.cookieName}=${r.token}`), true);
});

test('tampered, missing and expired cookies fail', () => {
  const clock = { t: 1_000_000 };
  const a = mk(clock);
  const { token } = a.attemptLogin('10.0.0.5', 'hunter2');
  assert.equal(a.verifyCookie(`${a.cookieName}=${token}x`), false);
  assert.equal(a.verifyCookie(''), false);
  assert.equal(a.verifyCookie(undefined), false);
  clock.t += 7 * 24 * 3600 * 1000 + 1;
  assert.equal(a.verifyCookie(`${a.cookieName}=${token}`), false);
});

test('wrong password fails; 5 failures lock out for 10 minutes', () => {
  const clock = { t: 1_000_000 };
  const a = mk(clock);
  for (let i = 0; i < 5; i++) assert.equal(a.attemptLogin('10.0.0.5', 'nope').ok, false);
  const locked = a.attemptLogin('10.0.0.5', 'hunter2');
  assert.equal(locked.ok, false);
  assert.equal(locked.locked, true);
  clock.t += 10 * 60 * 1000 + 1;
  assert.equal(a.attemptLogin('10.0.0.5', 'hunter2').ok, true);
});

test('no password configured means login always fails', () => {
  const a = createAuth({ passwordHash: '', secret: 's' });
  assert.equal(a.attemptLogin('127.0.0.1', '').ok, false);
});
