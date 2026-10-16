import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { openDb } from '../server/db.js';
import { loadDefs } from '../server/defs.js';
import { createTaskManager } from '../server/tasks.js';
import { createConversations, mentionedPersona } from '../server/conversations.js';
import { ROOT } from '../server/config.js';
import { seededRng } from '../server/scenarios.js';

const defs = loadDefs(path.join(ROOT, 'data-defs'));
const scn = {
  id: 'fix-it', title: 'Fix it', skills: ['files'], difficulty: 2, channel: 'backend', persona: 'tom', targets: ['app01'],
  vars: {}, message: 'please fix the thing', secret_context: 'SECRET: the config lost its port line', hints: ['look at the config', 'b', 'c'], followup_minutes: 20, dir: '/nonexistent',
};

function harness({ checks = [] } = {}) {
  const db = openDb(':memory:');
  const clock = { t: Date.parse('2026-10-16T12:00:00Z') };
  const seen = [];
  const persona = {
    online: true,
    async classify(ctx) { return { intent: /done/.test(ctx.message) ? 'done' : 'question', extracted: ctx.message }; },
    async reply(ctx, kind, extra) { seen.push({ kind, ctx }); return kind === 'fail' ? `FAIL:${extra.reason}` : kind.toUpperCase(); },
    async converse(ctx) { seen.push({ kind: 'converse', ctx }); return `${ctx.persona.id}: hi`; },
  };
  const runner = { setup: async (s, v) => v, check: async () => checks.shift() ?? { pass: true, reason: '' }, optional: async () => null, exists: () => false };
  const events = [];
  const broadcast = (e) => events.push(e);
  const tm = createTaskManager({ db, defs, scenarios: new Map([[scn.id, scn]]), runner, persona, broadcast, rng: seededRng(1), now: () => clock.t, readSolution: () => 'SOL' });
  const conv = createConversations({ db, defs, scenarios: new Map([[scn.id, scn]]), tm, persona, broadcast, openers: { leo: [{ q: 'what is 2>&1?', a: 'NOTES: fd 2 to fd 1' }] }, now: () => clock.t });
  return { db, tm, conv, clock, seen, events };
}

test('mentionedPersona matches @id or @firstname, case-insensitive', () => {
  assert.equal(mentionedPersona('hey @Kofi can you look', defs)?.id, 'kofi');
  assert.equal(mentionedPersona('@marcus ping', defs)?.id, 'marcus');
  assert.equal(mentionedPersona('no mention here', defs), null);
  assert.equal(mentionedPersona('@alertbot hi', defs), null, 'bots are not chat partners');
});

test('DM: persona answers with knowledge of the tickets they filed', async () => {
  const { db, tm, conv, seen } = harness();
  await tm.spawn({ force: true });
  await conv.post({ channel: 'dm:tom', text: 'which file did you edit?' });
  const dm = db.messages({ channel: 'dm:tom' });
  assert.deepEqual(dm.map((m) => m.author), ['me', 'tom']);
  const ctx = seen.find((s) => s.kind === 'chat' || s.kind === 'converse').ctx;
  assert.match(JSON.stringify(ctx), /config lost its port line/);
});

test('DM: "done" runs the check for that persona\'s open ticket; results land in the DM, solution in the thread', async () => {
  const { db, tm, conv } = harness();
  const t = await tm.spawn({ force: true });
  await conv.post({ channel: 'dm:tom', text: 'done, fixed it' });
  assert.equal(db.getTask(t.id).state, 'passed');
  assert.deepEqual(db.messages({ channel: 'dm:tom' }).map((m) => m.body), ['done, fixed it', 'PASS']);
  assert.equal(db.messages({ taskId: t.id }).at(-1).kind, 'solution');
});

test('DM with someone who has no open ticket is just conversation', async () => {
  const { db, conv } = harness();
  await conv.post({ channel: 'dm:kofi', text: 'done' });
  assert.deepEqual(db.messages({ channel: 'dm:kofi' }).map((m) => m.body), ['done', 'kofi: hi']);
});

test('channel post: only an @mentioned persona replies', async () => {
  const { db, conv } = harness();
  await conv.post({ channel: 'platform', text: 'anyone around?' });
  assert.equal(db.messages({ channel: 'platform' }).length, 1);
  await conv.post({ channel: 'platform', text: '@kofi got a sec?' });
  assert.deepEqual(db.messages({ channel: 'platform' }).map((m) => m.author), ['me', 'me', 'kofi']);
});

test('forward a ticket to a colleague: forwarded card posted, colleague reacts with a pointer-level hunch', async () => {
  const { db, tm, conv, seen } = harness();
  const t = await tm.spawn({ force: true });
  const root = db.messages({ taskId: t.id })[0];
  await conv.forward({ messageId: root.id, to: 'dm:kofi', note: 'any idea?' });
  const dm = db.messages({ channel: 'dm:kofi' });
  assert.equal(dm[0].kind, 'forward');
  assert.equal(dm[0].meta.from, 'tom');
  assert.equal(dm[0].meta.body, 'please fix the thing');
  assert.equal(dm[0].meta.taskId, t.id);
  assert.equal(dm[1].author, 'kofi');
  const ctx = seen.find((s) => s.kind === 'converse').ctx;
  assert.match(ctx.knowledge, /look at the config/, 'colleague gets the first hint as their hunch');
  assert.doesNotMatch(ctx.knowledge, /config lost its port line/, 'but not the hidden truth of someone else\'s ticket');
});

test('forward to a channel without mention: nobody replies', async () => {
  const { db, tm, conv } = harness();
  const t = await tm.spawn({ force: true });
  await conv.forward({ messageId: db.messages({ taskId: t.id })[0].id, to: 'platform', note: '' });
  assert.equal(db.messages({ channel: 'platform' }).length, 1);
});

test('forward rejects unknown targets and messages', async () => {
  const { conv } = harness();
  await assert.rejects(conv.forward({ messageId: 999, to: 'platform' }));
  await assert.rejects(conv.forward({ messageId: 1, to: 'dm:nobody' }));
});

test('answering Leo\'s DM question: he gets the answer notes to judge your reply', async () => {
  const { db, conv, seen } = harness();
  db.addMessage({ channel: 'dm:leo', author: 'leo', body: 'what is 2>&1?', meta: { opener: 0 } });
  await conv.post({ channel: 'dm:leo', text: 'it sends errors to the same place as normal output' });
  const ctx = seen.find((s) => s.kind === 'converse').ctx;
  assert.match(ctx.knowledge, /NOTES: fd 2 to fd 1/);
  assert.equal(db.messages({ channel: 'dm:leo' }).at(-1).author, 'leo');
});
