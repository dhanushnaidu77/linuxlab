import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openDb } from '../server/db.js';
import { loadDefs } from '../server/defs.js';
import { createTaskManager } from '../server/tasks.js';
import { LabError } from '../server/runner.js';
import { ROOT } from '../server/config.js';
import { seededRng } from '../server/scenarios.js';

const defs = loadDefs(path.join(ROOT, 'data-defs'));
const MIN = 60000;

const fix = {
  id: 'fix-it', title: 'Fix it', skills: ['files'], difficulty: 2, channel: 'platform', persona: 'marcus', targets: ['app01'],
  vars: { WHO: { pick: ['x'] } }, message: 'please fix {{WHO}}', secret_context: 's', hints: ['h1', 'h2', 'h3'], followup_minutes: 20, dir: '/nonexistent',
};
const ask = { ...fix, id: 'ask-it', skills: ['processes'], vars: { PID: { from_setup: true } }, message: 'what is the pid?', answer: { type: 'number', extract: 'the PID', value: '{{PID}}' } };

function harness({ checkResults = [], setupThrows = null, classify = null, scenarios = [fix] } = {}) {
  const db = openDb(':memory:');
  const events = [];
  const clock = { t: Date.parse('2026-10-15T12:00:00Z') };
  const calls = { cleanup: 0 };
  const runner = {
    async setup(scn, vars) { if (setupThrows) throw setupThrows; return scn.id === 'ask-it' ? { ...vars, PID: '4242' } : vars; },
    async check() { return checkResults.shift() ?? { pass: true, reason: '' }; },
    async optional(scn, name) { if (name === 'cleanup.sh') calls.cleanup++; return null; },
    exists: () => false,
  };
  const persona = {
    online: false,
    async classify(ctx) { return classify ? classify(ctx) : { intent: /done/.test(ctx.message) ? (ctx.answerTask ? 'answer' : 'done') : 'question', extracted: ctx.message }; },
    async reply(ctx, kind, extra) { return kind === 'fail' ? `FAIL:${extra.reason}` : kind.toUpperCase(); },
  };
  const tm = createTaskManager({
    db, defs, scenarios: new Map(scenarios.map((s) => [s.id, s])), runner, persona,
    broadcast: (e) => events.push(e), rng: seededRng(1), now: () => clock.t, readSolution: () => 'SOLUTION {{WHO}}',
  });
  return { db, tm, events, clock, calls };
}

test('spawn posts the rendered opening message in the scenario channel', async () => {
  const { db, tm } = harness();
  const task = await tm.spawn({ force: true });
  assert.equal(task.state, 'open');
  const msgs = db.messages({ channel: 'platform' });
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].author, 'marcus');
  assert.equal(msgs[0].body, 'please fix x');
  assert.equal(msgs[0].taskId, task.id);
});

test('"done" with failing check keeps task open and relays the reason', async () => {
  const { db, tm } = harness({ checkResults: [{ pass: false, reason: 'still 98% full' }] });
  const task = await tm.spawn({ force: true });
  await tm.reply(task.id, 'done');
  assert.equal(db.getTask(task.id).state, 'open');
  assert.equal(db.getTask(task.id).xpAwarded, 0);
  assert.deepEqual(db.attempts(task.id).map((a) => a.pass), [false]);
  assert.equal(db.messages({ taskId: task.id }).at(-1).body, 'FAIL:still 98% full');
});

test('"done" with passing check closes task, awards xp+mastery, posts solution, runs cleanup', async () => {
  const { db, tm, calls } = harness();
  const task = await tm.spawn({ force: true });
  await tm.reply(task.id, 'done');
  const t = db.getTask(task.id);
  assert.equal(t.state, 'passed');
  assert.equal(t.xpAwarded, 100);
  assert.equal(db.getMastery().files.score, 20);
  const last = db.messages({ taskId: task.id }).slice(-2);
  assert.equal(last[0].body, 'PASS');
  assert.equal(last[1].kind, 'solution');
  assert.equal(last[1].body, 'SOLUTION x');
  assert.equal(calls.cleanup, 1);
  assert.equal(db.streak('2026-10-15'), 1);
});

test('questions get a chat reply and never run the check', async () => {
  const { db, tm } = harness({ checkResults: [{ pass: false, reason: 'should not be used' }] });
  const task = await tm.spawn({ force: true });
  await tm.reply(task.id, 'which host?');
  assert.equal(db.attempts(task.id).length, 0);
  assert.equal(db.messages({ taskId: task.id }).at(-1).body, 'CHAT');
});

test('answer tasks compare the extracted value deterministically', async () => {
  const { db, tm } = harness({ scenarios: [ask], classify: (ctx) => ({ intent: 'answer', extracted: ctx.message }) });
  const task = await tm.spawn({ force: true });
  await tm.reply(task.id, '1234');
  assert.equal(db.getTask(task.id).state, 'open');
  await tm.reply(task.id, '4242');
  assert.equal(db.getTask(task.id).state, 'passed');
});

test('hints are sequential, capped at 3, and reduce xp', async () => {
  const { db, tm } = harness();
  const task = await tm.spawn({ force: true });
  assert.equal((await tm.hint(task.id)).body, 'h1');
  assert.equal((await tm.hint(task.id)).body, 'h2');
  assert.equal((await tm.hint(task.id)).body, 'h3');
  assert.equal(await tm.hint(task.id), null);
  await tm.reply(task.id, 'done');
  assert.equal(db.getTask(task.id).xpAwarded, 25);
});

test('skip abandons with a small mastery penalty and shows the solution', async () => {
  const { db, tm } = harness();
  db.setMastery('files', 10, Date.now());
  const task = await tm.spawn({ force: true });
  await tm.skip(task.id);
  assert.equal(db.getTask(task.id).state, 'abandoned');
  assert.equal(db.getMastery().files.score, 8);
  assert.equal(db.messages({ taskId: task.id }).at(-1).kind, 'solution');
});

test('lab failure during setup: task errored, nothing posted, no crash', async () => {
  const { db, tm, events } = harness({ setupThrows: new LabError('lab unavailable') });
  const task = await tm.spawn({ force: true });
  assert.equal(task, null);
  assert.equal(db.messages({ channel: 'platform' }).length, 0);
  assert.equal(db.recentTasks(5).every((t) => t.state === 'error'), true);
  assert.ok(events.some((e) => e.type === 'lab' && e.status === 'offline'));
});

test('lab failure during check: task stays open, system notice posted', async () => {
  const { db, tm } = harness();
  const task = await tm.spawn({ force: true });
  tm._runner.check = async () => { throw new LabError('lab unavailable'); };
  await tm.reply(task.id, 'done');
  assert.equal(db.getTask(task.id).state, 'open');
  assert.equal(db.messages({ taskId: task.id }).at(-1).author, 'system');
});

test('tick nudges after followup minutes, at most twice', async () => {
  const { db, tm, clock } = harness();
  const task = await tm.spawn({ force: true });
  clock.t += 19 * MIN; await tm.tick();
  assert.equal(db.messages({ taskId: task.id }).length, 1);
  clock.t += 2 * MIN; await tm.tick();
  clock.t += 21 * MIN; await tm.tick();
  clock.t += 21 * MIN; await tm.tick();
  assert.deepEqual(db.messages({ taskId: task.id }).map((m) => m.body), ['please fix x', 'NUDGE', 'NUDGE']);
});

test('auto-spawn respects pause, clients, interval and open-task cap', async () => {
  const { db, tm, clock } = harness({ scenarios: [fix, { ...fix, id: 'f2' }, { ...fix, id: 'f3' }, { ...fix, id: 'f4' }] });
  tm.setClientCount(0);
  clock.t += 60 * MIN; await tm.tick();
  assert.equal(db.openTasks().length, 0);
  tm.setClientCount(1);
  db.setSetting('paused', true);
  clock.t += 60 * MIN; await tm.tick();
  assert.equal(db.openTasks().length, 0);
  db.setSetting('paused', false);
  for (let i = 0; i < 6; i++) { clock.t += 60 * MIN; await tm.tick(); }
  assert.equal(db.openTasks().length, 3);
});
