import express from 'express';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { isAllowed } from './allowlist.js';
import { attachTerminal } from './term.js';
import * as P from './progress.js';
import { ROOT } from './config.js';

const clientIp = (req) => req.socket.remoteAddress;

export function createApp({ auth, db, defs, scenarios, tm, persona, lab, log = () => {} }) {
  const tailscale = () => db.getSetting('tailscale', false);
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    if (!isAllowed(clientIp(req), { tailscale: tailscale() })) { log(`denied ${clientIp(req)} ${req.method} ${req.url}`); return res.status(403).end('Forbidden'); }
    res.set({ 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  app.use('/vendor/xterm', express.static(path.join(ROOT, 'node_modules/@xterm/xterm')));
  app.use('/vendor/xterm-fit', express.static(path.join(ROOT, 'node_modules/@xterm/addon-fit')));
  app.use(express.static(path.join(ROOT, 'web')));

  app.post('/api/login', (req, res) => {
    const r = auth.attemptLogin(clientIp(req), req.body?.password);
    if (!r.ok) return res.status(r.locked ? 429 : 401).json({ error: r.locked ? 'Too many attempts — locked for 10 minutes' : 'Wrong password' });
    res.cookie(auth.cookieName, r.token, { httpOnly: true, sameSite: 'strict', maxAge: r.maxAge, path: '/' });
    res.json({ ok: true });
  });
  app.post('/api/logout', (req, res) => { res.clearCookie(auth.cookieName, { path: '/' }); res.json({ ok: true }); });

  app.use('/api', (req, res, next) => (auth.verifyCookie(req.headers.cookie) ? next() : res.status(401).json({ error: 'login required' })));

  let labState = { status: 'unknown', hosts: {} };
  const setLabState = (s) => { labState = s; };

  function state() {
    const now = Date.now();
    const raw = db.getMastery();
    const mastery = Object.fromEntries([...defs.skills.keys()].map((k) => [k, P.decay(raw[k]?.score ?? 0, raw[k]?.lastPracticed, now)]));
    const xp = db.totalXp();
    return {
      channels: [...defs.channels.values()],
      personas: Object.fromEntries([...defs.personas.values()].map((p) => [p.id, { name: p.name, role: p.role, avatar: p.avatar, team: p.team }])),
      skills: [...defs.skills.values()].map((s) => ({ ...s, mastery: mastery[s.id], unlocked: P.unlocked(defs.skills, mastery).has(s.id), scenarios: [...scenarios.values()].filter((x) => x.skills[0] === s.id).length })),
      xp, level: P.level(xp), nextLevelXp: 100 * P.level(xp) ** 2, streak: db.streak(new Date().toISOString().slice(0, 10)),
      openTasks: db.openTasks().map(tm.summary),
      recentTasks: db.recentTasks(15).filter((t) => !['open', 'checking', 'pending_setup'].includes(t.state)).map(tm.summary),
      lastMessageIds: db.lastMessageIds(),
      settings: { paused: db.getSetting('paused', false), interval: db.getSetting('interval', { min: 5, max: 20 }), tailscale: tailscale(), live: db.getSetting('live', false) },
      nextSpawnAt: tm.nextSpawnAt(),
      lab: labState,
      personaOnline: persona.online,
      scenarioCount: scenarios.size,
    };
  }

  const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => { log(`api error ${req.url}: ${e.stack}`); res.status(500).json({ error: e.message }); });
  const taskId = (req) => Number(req.params.id);

  app.get('/api/state', (req, res) => res.json(state()));
  app.get('/api/messages', (req, res) => res.json(db.messages({ channel: String(req.query.channel || '') })));
  app.get('/api/tasks/:id/messages', (req, res) => res.json(db.messages({ taskId: taskId(req) })));
  app.post('/api/tasks/spawn', wrap(async (req, res) => {
    const t = await tm.spawn({ force: true });
    tm.rescheduleSpawn();
    res.json(t ? { task: t } : { error: 'No eligible scenario could be started (lab down, or nothing unlocked left?)' });
  }));
  app.post('/api/tasks/:id/reply', wrap(async (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 4000);
    if (!text) return res.status(400).json({ error: 'empty message' });
    res.json(await tm.reply(taskId(req), text));
  }));
  app.post('/api/tasks/:id/hint', wrap(async (req, res) => res.json({ hint: await tm.hint(taskId(req)) })));
  app.post('/api/tasks/:id/skip', wrap(async (req, res) => res.json({ ok: await tm.skip(taskId(req)) })));

  app.post('/api/settings', (req, res) => {
    const b = req.body || {};
    if (typeof b.paused === 'boolean') db.setSetting('paused', b.paused);
    if (typeof b.tailscale === 'boolean') db.setSetting('tailscale', b.tailscale);
    if (typeof b.live === 'boolean' && b.live !== db.getSetting('live', false)) {
      db.setSetting('live', b.live);
      if (b.live) db.setSetting('liveSince', Date.now());
      broadcast({ type: 'progress' });
    }
    if (b.interval && Number.isFinite(b.interval.min) && Number.isFinite(b.interval.max) && b.interval.min >= 1 && b.interval.max >= b.interval.min && b.interval.max <= 240) {
      db.setSetting('interval', { min: b.interval.min, max: b.interval.max });
      tm.rescheduleSpawn();
    }
    res.json(state().settings);
  });

  app.post('/api/lab/reset', wrap(async (req, res) => {
    const host = req.body?.host || null;
    const r = await lab.reset(host);
    if (r.ok) tm.cancelOpen(host ? `${host} was reset` : 'the lab was reset');
    res.json({ ok: r.ok, error: r.ok ? undefined : r.stderr.slice(0, 500) });
  }));
  // testing aid: wipe all progress/chat and rebuild the whole lab
  app.post('/api/reset-all', wrap(async (req, res) => {
    tm.cancelOpen('everything was reset');
    db.resetProgress();
    tm.rescheduleSpawn();
    const r = await lab.reset(null);
    broadcast({ type: 'reset' });
    res.json({ ok: r.ok, error: r.ok ? undefined : r.stderr.slice(0, 500) });
  }));
  app.post('/api/lab/start', wrap(async (req, res) => { const r = await lab.start(); res.json({ ok: r.ok, error: r.ok ? undefined : r.stderr.slice(0, 500) }); }));

  // ---- websockets
  const events = new WebSocketServer({ noServer: true });
  const terms = new WebSocketServer({ noServer: true });

  function broadcast(evt) {
    const data = JSON.stringify(evt);
    for (const c of events.clients) if (c.readyState === c.OPEN) c.send(data);
  }
  events.on('connection', (ws) => {
    tm.setClientCount(events.clients.size);
    ws.on('close', () => tm.setClientCount(events.clients.size));
  });
  terms.on('connection', (ws) => attachTerminal(ws, { log }));

  function handleUpgrade(req, socket, head) {
    const deny = (code) => { socket.write(`HTTP/1.1 ${code}\r\n\r\n`); socket.destroy(); };
    if (!isAllowed(clientIp(req), { tailscale: tailscale() })) return deny('403 Forbidden');
    if (!auth.verifyCookie(req.headers.cookie)) return deny('401 Unauthorized');
    // block cross-site websocket hijacking: Origin must match the Host we were reached on
    try { if (new URL(req.headers.origin).host !== req.headers.host) return deny('403 Forbidden'); } catch { return deny('403 Forbidden'); }
    const url = new URL(req.url, 'http://x');
    const wss = url.pathname === '/ws/events' ? events : url.pathname === '/ws/term' ? terms : null;
    if (!wss) return deny('404 Not Found');
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  }

  return { app, handleUpgrade, broadcast, setLabState, state, clientCount: () => events.clients.size };
}
