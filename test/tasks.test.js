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
  const calls = { cleanup: 0, ran: [] };
  const runner = {
    async setup(scn, vars) { if (setupThrows) throw setupThrows; return scn.id === 'ask-it' ? { ...vars, PID: '4242' } : vars; },
    async check() { return checkResults.shift() ?? { pass: true, reason: '' }; },
    async optional(scn, name) { if (name === 'cleanup.sh') calls.cleanup++; else calls.ran.push(name); return null; },
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
  // nudges land in the thread or (sometimes) as a DM from the requester — two in total either way
  const inThread = db.messages({ taskId: task.id }).filter((m) => m.body === 'NUDGE').length;
  const inDm = db.messages({ channel: 'dm:marcus' }).filter((m) => m.body === 're: Fix it — NUDGE' && m.meta.re === task.id).length;
  assert.equal(inThread + inDm, 2);
});

test('live auto-spawn respects pause, clients, interval and open-task cap', async () => {
  const { db, tm, clock } = harness({ scenarios: [fix, { ...fix, id: 'f2' }, { ...fix, id: 'f3' }, { ...fix, id: 'f4' }] });
  db.setSetting('live', true);
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

test('cancelOpen closes all open tasks without penalty', async () => {
  const { db, tm } = harness({ scenarios: [fix, { ...fix, id: 'f2' }] });
  await tm.spawn({ force: true }); await tm.spawn({ force: true });
  tm.cancelOpen('the lab was reset');
  assert.equal(db.openTasks().length, 0);
  assert.deepEqual(db.getMastery(), {});
});

// ---- live mode: unfolding incident timelines
const timed = {
  ...fix, id: 'timed', followup_minutes: 999,
  timeline: [
    { at: 5, persona: 'priya', text: 'customers asking about {{WHO}} 😬' },
    { at: 10, persona: 'diane', channel: 'oncall-alerts', text: 'ETA?' },
    { at: 12, persona: 'marcus', text: 'worse now', run: 'escalate.sh' },
  ],
};

test('timeline is silent when live mode is off', async () => {
  const { db, tm, clock } = harness({ scenarios: [timed] });
  const task = await tm.spawn({ force: true });
  clock.t += 30 * MIN; await tm.tick();
  assert.equal(db.messages({ taskId: task.id }).length, 1);
});

test('timeline fires each entry once, in order, at its time, and runs escalation scripts', async () => {
  const { db, tm, clock, calls } = harness({ scenarios: [timed] });
  db.setSetting('live', true);
  const task = await tm.spawn({ force: true });
  clock.t += 4 * MIN; await tm.tick();
  assert.equal(db.messages({ taskId: task.id }).length, 1);
  clock.t += 2 * MIN; await tm.tick(); await tm.tick();
  assert.deepEqual(db.messages({ taskId: task.id }).map((m) => m.body), ['please fix x', 'customers asking about x 😬']);
  clock.t += 10 * MIN; await tm.tick();
  const alerts = db.messages({ channel: 'oncall-alerts' });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].author, 'diane');
  assert.equal(alerts[0].taskId, null);
  assert.equal(db.messages({ taskId: task.id }).at(-1).body, 'worse now');
  assert.deepEqual(calls.ran, ['escalate.sh']);
  await tm.tick();
  assert.equal(calls.ran.length, 1);
});

test('timeline stops once the task is closed', async () => {
  const { db, tm, clock } = harness({ scenarios: [timed] });
  db.setSetting('live', true);
  const task = await tm.spawn({ force: true });
  await tm.reply(task.id, 'done');
  clock.t += 30 * MIN; await tm.tick();
  assert.equal(db.messages({ taskId: task.id }).filter((m) => m.author === 'priya').length, 0);
});

test('turning live mode on mid-ticket skips entries that were already due (no burst)', async () => {
  const { db, tm, clock, calls } = harness({ scenarios: [timed] });
  const task = await tm.spawn({ force: true });
  clock.t += 11 * MIN;
  db.setSetting('live', true); db.setSetting('liveSince', clock.t);
  await tm.tick();
  assert.equal(db.messages({ taskId: task.id }).length, 1);
  assert.equal(db.messages({ channel: 'oncall-alerts' }).length, 0);
  clock.t += 2 * MIN; await tm.tick();
  assert.equal(db.messages({ taskId: task.id }).at(-1).body, 'worse now');
  assert.deepEqual(calls.ran, ['escalate.sh']);
});

test('outside live mode, some spawns become a DM question instead of a ticket', async () => {
  let asked = 0;
  const db = openDb(':memory:');
  const tm = createTaskManager({ db, defs, scenarios: new Map([[fix.id, fix]]), runner: { setup: async (s, v) => v, check: async () => ({ pass: true }), optional: async () => null },
    persona: { online: false, classify: async () => ({}), reply: async () => '' }, broadcast: () => {}, rng: seededRng(9),
    askQuestion: () => { asked++; return { channel: 'dm:leo' }; } });
  let questions = 0;
  for (let i = 0; i < 200; i++) { const r = await tm.spawn({ force: true }); if (r?.question) questions++; else if (r) tm.cancelOpen('x'); }
  assert.ok(questions >= 15 && questions <= 50, `${questions}/200 were questions`);
  assert.equal(asked, questions);
  db.setSetting('live', true);
  for (let i = 0; i < 50; i++) { const r = await tm.spawn({ force: true }); assert.ok(!r?.question, 'live mode uses its own schedule'); if (r) tm.cancelOpen('x'); }
});

test('tick only spawns tickets on its own in live mode', async () => {
  const { db, tm, clock } = harness();
  tm.setClientCount(1);
  for (let i = 0; i < 20; i++) { clock.t += 60 * MIN; await tm.tick(); }
  assert.equal(db.openTasks().length, 0, 'no auto tickets with live mode off');
  assert.equal(tm.nextSpawnAt(), null);
  tm.rescheduleSpawn();
  assert.equal(tm.nextSpawnAt(), null, 'no countdown shown with live mode off');
  db.setSetting('live', true);
  for (let i = 0; i < 20; i++) { clock.t += 60 * MIN; await tm.tick(); }
  assert.ok(db.openTasks().length > 0, 'live mode spawns on its schedule');
});
