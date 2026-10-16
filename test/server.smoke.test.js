import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import WebSocket from 'ws';
import { openDb } from '../server/db.js';
import { loadDefs } from '../server/defs.js';
import { createAuth } from '../server/auth.js';
import { createTaskManager } from '../server/tasks.js';
import { createPersonaEngine } from '../server/persona.js';
import { createApp } from '../server/http.js';
import { ROOT } from '../server/config.js';

const labUp = (() => { try { return execSync('docker inspect -f {{.State.Running}} jump01', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() === 'true'; } catch { return false; } })();
const scn = { id: 's', title: 'T', skills: ['files'], difficulty: 1, channel: 'platform', persona: 'raj', targets: ['jump01'], vars: {}, message: 'hello', secret_context: 'x', hints: ['a', 'b', 'c'], followup_minutes: 20, dir: '/nonexistent' };
let server, base, cookie;

before(async () => {
  const db = openDb(':memory:');
  const defs = loadDefs(path.join(ROOT, 'data-defs'));
  const scenarios = new Map([[scn.id, scn]]);
  const persona = createPersonaEngine({ apiKey: '' });
  const runner = { setup: async (s, v) => v, check: async () => ({ pass: true, reason: '' }), optional: async () => null, exists: () => false };
  let bc = () => {};
  const tm = createTaskManager({ db, defs, scenarios, runner, persona, broadcast: (e) => bc(e), readSolution: () => 'sol' });
  const auth = createAuth({ passwordHash: bcrypt.hashSync('pw', 4), secret: 'x' });
  const conv = { post: async () => ({}), forward: async () => ({}) };
  const web = createApp({ auth, db, defs, scenarios, tm, conv, persona, lab: { reset: async () => ({ ok: true }), start: async () => ({ ok: true }) } });
  bc = web.broadcast;
  server = http.createServer(web.app);
  server.on('upgrade', web.handleUpgrade);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const api = (p, opts = {}) => fetch(base + p, { ...opts, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...opts.headers } });

test('api requires login; wrong password rejected; right password sets cookie', async () => {
  assert.equal((await api('/api/state')).status, 401);
  assert.equal((await api('/api/login', { method: 'POST', body: JSON.stringify({ password: 'nope' }) })).status, 401);
  const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: 'pw' }) });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
  assert.match(r.headers.get('set-cookie'), /HttpOnly/i);
  const st = await (await api('/api/state')).json();
  assert.ok(st.channels.length >= 6);
  assert.equal(st.personaOnline, false);
});

test('static UI served', async () => {
  assert.equal((await fetch(base + '/')).status, 200);
});

test('spawn → reply done → event stream sees messages', async () => {
  const ws = new WebSocket(base.replace('http', 'ws') + '/ws/events', { headers: { cookie, origin: base } });
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
  const got = [];
  ws.on('message', (d) => got.push(JSON.parse(d)));
  const { task } = await (await api('/api/tasks/spawn', { method: 'POST' })).json();
  assert.equal(task.title, 'T');
  const res = await (await api(`/api/tasks/${task.id}/reply`, { method: 'POST', body: JSON.stringify({ text: 'done' }) })).json();
  assert.equal(res.pass, true);
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(got.some((e) => e.type === 'message' && e.message.body === 'hello'));
  assert.ok(got.some((e) => e.type === 'message' && e.message.kind === 'solution'));
  ws.close();
});

const wsFails = (url, headers) => new Promise((resolve) => {
  const ws = new WebSocket(url, { headers });
  ws.on('open', () => { ws.close(); resolve(false); });
  ws.on('error', () => resolve(true));
  ws.on('unexpected-response', () => resolve(true));
});

test('websocket upgrade rejects missing cookie and foreign origin', async () => {
  const url = base.replace('http', 'ws') + '/ws/term';
  assert.equal(await wsFails(url, { origin: base }), true);
  assert.equal(await wsFails(url, { cookie, origin: 'http://evil.example' }), true);
});

test('terminal websocket reaches jump01', { skip: !labUp && 'lab not running' }, async () => {
  const ws = new WebSocket(base.replace('http', 'ws') + '/ws/term', { headers: { cookie, origin: base } });
  let out = '';
  ws.on('message', (d) => (out += d.toString()));
  await new Promise((r) => ws.on('open', r));
  await new Promise((r) => setTimeout(r, 1200));
  ws.send(JSON.stringify({ t: 'i', d: 'echo "H=$(hostname) U=$(whoami)"\r' }));
  await new Promise((r) => setTimeout(r, 1200));
  ws.close();
  assert.match(out, /H=jump01 U=dhan/);
});
