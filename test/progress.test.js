import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../server/progress.js';
import { pickScenario } from '../server/scheduler.js';
import { seededRng } from '../server/scenarios.js';

const DAY = 86400000;
const skills = new Map(Object.entries({
  files: { id: 'files', tier: 1, requires: [] },
  processes: { id: 'processes', tier: 1, requires: [] },
  systemd: { id: 'systemd', tier: 2, requires: ['processes'] },
}));

test('mastery gain is difficulty-weighted and reduced by hints', () => {
  assert.equal(P.masteryGain(2, 0), 20);
  assert.equal(P.masteryGain(2, 1), 15);
  assert.equal(P.masteryGain(1, 3), 3);
  assert.equal(P.applyGain(95, 20), 100);
});

test('xp reward', () => {
  assert.equal(P.xpReward(2, 0), 100);
  assert.equal(P.xpReward(2, 2), 50);
});

test('decay: none within 7 days, then 1/day, floor 0', () => {
  assert.equal(P.decay(50, 0, 7 * DAY), 50);
  assert.equal(P.decay(50, 0, 10 * DAY), 47);
  assert.equal(P.decay(2, 0, 30 * DAY), 0);
  assert.equal(P.decay(50, null, 30 * DAY), 50);
});

test('unlocks: no requires = unlocked; requires need >=30', () => {
  assert.deepEqual([...P.unlocked(skills, {})].sort(), ['files', 'processes']);
  assert.ok(!P.unlocked(skills, { processes: 29 }).has('systemd'));
  assert.ok(P.unlocked(skills, { processes: 30 }).has('systemd'));
});

test('level grows with xp', () => {
  assert.equal(P.level(0), 1);
  assert.equal(P.level(100), 2);
  assert.equal(P.level(400), 3);
});

const mk = (id, skill, difficulty = 1) => ({ id, skills: [skill], difficulty });
const pool = [mk('f1', 'files'), mk('f2', 'files'), mk('p1', 'processes'), mk('s1', 'systemd'), mk('f-hard', 'files', 5)];

test('picker excludes locked skills, recent ids and out-of-band difficulty', () => {
  const unlocked = P.unlocked(skills, {});
  for (let i = 0; i < 200; i++) {
    const s = pickScenario({ scenarios: pool, mastery: {}, unlocked, recentIds: ['f1'], rng: seededRng(i) });
    assert.ok(['f2', 'p1'].includes(s.id), s.id);
  }
});

test('picker returns null when nothing eligible', () => {
  assert.equal(pickScenario({ scenarios: [mk('s1', 'systemd')], mastery: {}, unlocked: new Set(['files']), recentIds: [], rng: Math.random }), null);
});

test('picker relaxes difficulty band rather than returning nothing', () => {
  const s = pickScenario({ scenarios: [mk('hard', 'files', 5)], mastery: {}, unlocked: new Set(['files']), recentIds: [], rng: Math.random });
  assert.equal(s.id, 'hard');
});

test('picker favours the weakest skill', () => {
  const unlocked = new Set(['files', 'processes']);
  const count = { files: 0, processes: 0 };
  for (let i = 0; i < 2000; i++) {
    const s = pickScenario({ scenarios: [mk('f', 'files', 3), mk('p', 'processes', 1)], mastery: { files: 60, processes: 0 }, unlocked, recentIds: [], rng: seededRng(i) });
    count[s.skills[0]]++;
  }
  assert.ok(count.processes > count.files * 1.5, JSON.stringify(count));
});

test('picker still serves easy tickets to an advanced player (~20%)', () => {
  const all = ['files', 'processes'];
  const pool = [mk('easy-f', 'files', 1), mk('easy-p', 'processes', 2), mk('hard-f', 'files', 5), mk('hard-p', 'processes', 4)];
  let easy = 0;
  for (let i = 0; i < 2000; i++) {
    const s = pickScenario({ scenarios: pool, mastery: { files: 100, processes: 90 }, unlocked: new Set(all), recentIds: [], rng: seededRng(i) });
    if (s.difficulty <= 2) easy++;
  }
  assert.ok(easy > 300 && easy < 550, `easy picks: ${easy}/2000`);
});
