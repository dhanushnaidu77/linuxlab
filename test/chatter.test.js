import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openDb } from '../server/db.js';
import { loadDefs } from '../server/defs.js';
import { loadChatter, createChatter } from '../server/chatter.js';
import { seededRng } from '../server/scenarios.js';
import { ROOT } from '../server/config.js';

const MIN = 60000;
const defs = loadDefs(path.join(ROOT, 'data-defs'));
const convos = [
  { channel: 'platform', lines: [['marcus', 'deploying to {{HOST}}'], ['leah', 'ack']] },
  { channel: 'backend', lines: [['tom', 'build is green']] },
];

function harness() {
  const db = openDb(':memory:');
  const clock = { t: 0 };
  const events = [];
  let clients = 1;
  const ch = createChatter({ db, convos, broadcast: (e) => events.push(e), rng: seededRng(3), now: () => clock.t, clientCount: () => clients });
  return { db, ch, clock, events, setClients: (n) => { clients = n; } };
}
const all = (db) => ['platform', 'backend'].flatMap((c) => db.messages({ channel: c })).sort((a, b) => a.id - b.id);

test('real chatter file loads and is valid', () => {
  const { convos: real, warnings } = loadChatter(path.join(ROOT, 'data-defs'), defs);
  assert.deepEqual(warnings, []);
  assert.ok(real.length >= 30, `only ${real.length} conversations`);
});

test('silent when live mode is off or nobody is connected', async () => {
  const { db, ch, clock, setClients } = harness();
  for (let i = 0; i < 20; i++) { clock.t += 10 * MIN; await ch.tick(); }
  assert.equal(all(db).length, 0);
  db.setSetting('live', true); setClients(0);
  for (let i = 0; i < 20; i++) { clock.t += 10 * MIN; await ch.tick(); }
  assert.equal(all(db).length, 0);
});

test('slow pace: first message after a few minutes, then 20-40 min apart', async () => {
  const { db, ch, clock } = harness();
  db.setSetting('live', true);
  await ch.tick();
  assert.equal(all(db).length, 0, 'nothing immediately on enable');
  const starts = [];
  for (let i = 0; i < 6 * 60 * 4; i++) { // 6 hours in 15s ticks
    clock.t += 15000;
    const before = all(db).length;
    await ch.tick();
    if (all(db).length > before && all(db).at(-1).author !== 'leah') starts.push(clock.t);
  }
  assert.ok(starts[0] >= 3 * MIN && starts[0] <= 8 * MIN, `first at ${starts[0] / MIN}m`);
  for (let i = 1; i < starts.length; i++) {
    const gap = (starts[i] - starts[i - 1]) / MIN;
    assert.ok(gap >= 20 && gap <= 41, `gap ${gap}m`);
  }
  assert.ok(starts.length >= 8 && starts.length <= 18, `${starts.length} conversations in 6h`);
});

test('multi-line conversations are spaced out and templated', async () => {
  const { db, ch, clock } = harness();
  db.setSetting('live', true);
  for (let i = 0; i < 4 * 60 * 4; i++) { clock.t += 15000; await ch.tick(); }
  const p = db.messages({ channel: 'platform' });
  const first = p.findIndex((m) => m.author === 'marcus');
  assert.ok(first >= 0);
  assert.match(p[first].body, /^deploying to (jump01|rtr01|web01|app01|db01|ns01)$/);
  assert.equal(p[first + 1].author, 'leah');
  assert.ok(p[first + 1].at - p[first].at >= MIN, 'replies are not instant');
  assert.ok(p.every((m) => m.taskId === null));
});
