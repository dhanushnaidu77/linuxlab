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

const SOCIAL_FIRST = [10, 25];
const SOCIAL_GAP = [60, 120];

export function loadSocial(dir, defs) {
  const file = path.join(dir, 'social.yaml');
  if (!fs.existsSync(file)) return {};
  const raw = YAML.parse(fs.readFileSync(file, 'utf8')) || {};
  return Object.fromEntries(Object.entries(raw).filter(([id, lines]) => defs.personas.get(id)?.social && Array.isArray(lines) && lines.length));
}

export function createChatter({ db, convos, social = {}, broadcast, rng = Math.random, now = Date.now, clientCount = () => 1 }) {
  let nextAt = null;
  let socialAt = null;
  const socialRecent = [];
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

  function socialTick() {
    const people = Object.keys(social);
    if (!db.getSetting('social', true) || !people.length) { socialAt = null; return; }
    if (socialAt === null) socialAt = now() + between(SOCIAL_FIRST);
    if (now() < socialAt) return;
    socialAt = now() + between(SOCIAL_GAP);
    const who = people[Math.floor(rng() * people.length)];
    const lines = social[who].filter((l) => !socialRecent.includes(l));
    const body = (lines.length ? lines : social[who])[Math.floor(rng() * (lines.length || social[who].length))];
    socialRecent.push(body);
    if (socialRecent.length > Math.max(0, social[who].length - 2)) socialRecent.shift();
    broadcast({ type: 'message', message: db.addMessage({ channel: `dm:${who}`, author: who, body, now: now() }) });
  }

  async function tick() {
    const live = db.getSetting('live', false) && !db.getSetting('paused', false) && clientCount() > 0;
    if (!live) { nextAt = null; socialAt = null; queue = []; return; }
    socialTick();
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

  return { tick };
}
