// Live mode background chatter: pre-written, work-only conversations between coworkers, at a slow pace.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { HOSTS } from './scenarios.js';

const FIRST_DELAY = [3, 8]; // minutes after live mode starts
const GAP = [20, 40]; // minutes between conversations
const REPLY_GAP = [1, 3]; // minutes between lines within a conversation
const VERSIONS = ['2.14.1', '2.14.2', '2.15.0', '3.0.0-rc1'];

export function loadChatter(dir, defs) {
  const file = path.join(dir, 'chatter.yaml');
  const warnings = [];
  if (!fs.existsSync(file)) return { convos: [], warnings };
  const raw = YAML.parse(fs.readFileSync(file, 'utf8')) || [];
  const convos = raw.filter((c, i) => {
    const bad = !defs.channels.has(c?.channel) ? `unknown channel ${c?.channel}`
      : !Array.isArray(c.lines) || !c.lines.length ? 'no lines'
      : c.lines.find((l) => !Array.isArray(l) || !defs.personas.has(l[0]) || typeof l[1] !== 'string') ? 'bad line (want [persona, "text"])' : null;
    if (bad) warnings.push(`chatter #${i + 1}: ${bad}`);
    return !bad;
  });
  return { convos, warnings };
}

const OPENER_FIRST = [8, 20]; // minutes after live mode starts
const OPENER_GAP = [45, 90]; // per person

// openers: { personaId: [ "text" | { q, a } ] }
export function loadDmOpeners(dir, defs) {
  const file = path.join(dir, 'dm-openers.yaml');
  if (!fs.existsSync(file)) return {};
  const raw = YAML.parse(fs.readFileSync(file, 'utf8')) || {};
  return Object.fromEntries(Object.entries(raw)
    .filter(([id, items]) => defs.personas.has(id) && Array.isArray(items) && items.length)
    .map(([id, items]) => [id, items.map((it) => (typeof it === 'string' ? { q: it } : it)).filter((it) => it?.q)]));
}

export function createChatter({ db, convos, openers = {}, broadcast, rng = Math.random, now = Date.now, clientCount = () => 1 }) {
  let nextAt = null;
  const openerAt = {}; // personaId -> next opener time
  const openerRecent = {}; // personaId -> recently used indexes
  let queue = []; // { at, channel, author, body }
  const recent = [];
  const between = ([a, b]) => (a + rng() * (b - a)) * 60000;
  const fill = (text) => text
    .replace(/\{\{HOST\}\}/g, () => HOSTS[Math.floor(rng() * HOSTS.length)])
    .replace(/\{\{VER\}\}/g, () => VERSIONS[Math.floor(rng() * VERSIONS.length)])
    .replace(/\{\{NUM\}\}/g, () => String(2 + Math.floor(rng() * 40)));

  function start() {
    const pool = convos.map((_, i) => i).filter((i) => !recent.includes(i));
    if (!pool.length) return;
    const idx = pool[Math.floor(rng() * pool.length)];
    recent.push(idx);
    if (recent.length > Math.min(15, convos.length - 1)) recent.shift();
    const c = convos[idx];
    let at = now();
    queue = c.lines.map(([author, text], i) => ({ at: (at += i ? between(REPLY_GAP) : 0), channel: c.channel, author, body: fill(text) }));
  }

  function openersTick() {
    for (const who of Object.keys(openers)) {
      if (openerAt[who] == null) { openerAt[who] = now() + between(OPENER_FIRST); continue; }
      if (now() < openerAt[who]) continue;
      openerAt[who] = now() + between(OPENER_GAP);
      askNow(who);
    }
  }

  // post one opener right now (used outside live mode, in place of a ticket); returns the message or null
  function askNow(who = null) {
    const people = Object.keys(openers);
    if (!people.length) return null;
    who ??= people[Math.floor(rng() * people.length)];
    const items = openers[who];
    const recent = (openerRecent[who] ||= []);
    const pool = items.map((_, i) => i).filter((i) => !recent.includes(i));
    const idx = pool[Math.floor(rng() * pool.length)];
    recent.push(idx);
    if (recent.length > Math.max(0, items.length - 2)) recent.shift();
    const m = db.addMessage({ channel: `dm:${who}`, author: who, body: items[idx].q, meta: { opener: idx }, now: now() });
    broadcast({ type: 'message', message: m });
    return m;
  }

  async function tick() {
    const live = db.getSetting('live', false) && !db.getSetting('paused', false) && clientCount() > 0;
    if (!live) { nextAt = null; for (const k of Object.keys(openerAt)) delete openerAt[k]; queue = []; return; }
    openersTick();
    if (nextAt === null) nextAt = now() + between(FIRST_DELAY);
    while (queue.length && queue[0].at <= now()) {
      const m = queue.shift();
      broadcast({ type: 'message', message: db.addMessage({ channel: m.channel, author: m.author, body: m.body, now: now() }) });
    }
    if (!queue.length && now() >= nextAt) {
      start();
      nextAt = now() + between(GAP);
      await tick();
    }
  }

  return { tick, askNow };
}
