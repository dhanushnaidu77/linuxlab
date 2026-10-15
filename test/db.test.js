import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';

test('tasks, messages, attempts, mastery, settings, streak round-trip', () => {
  const db = openDb(':memory:');
  const id = db.createTask({ scenarioId: 's1', vars: { A: '1' }, channel: 'platform', persona: 'marcus', now: 1000 });
  db.updateTask(id, { state: 'open' });
  assert.equal(db.getTask(id).state, 'open');
  assert.deepEqual(db.getTask(id).vars, { A: '1' });
  assert.equal(db.openTasks().length, 1);
  db.addMessage({ channel: 'platform', taskId: id, author: 'marcus', body: 'hi', now: 1001 });
  db.addMessage({ channel: 'platform', taskId: null, author: 'me', body: 'yo', now: 1002 });
  assert.equal(db.messages({ channel: 'platform' }).length, 2);
  assert.equal(db.messages({ taskId: id }).length, 1);
  db.addAttempt(id, false, 'nope', 1003);
  assert.equal(db.attempts(id).length, 1);
  db.setMastery('files', 40, 5000);
  assert.deepEqual(db.getMastery(), { files: { score: 40, lastPracticed: 5000 } });
  db.setSetting('paused', true);
  assert.equal(db.getSetting('paused'), true);
  assert.equal(db.getSetting('missing', 'dflt'), 'dflt');
  assert.deepEqual(db.recentScenarioIds(10), ['s1']);
  db.updateTask(id, { state: 'passed', xpAwarded: 50 });
  assert.equal(db.totalXp(), 50);
  db.markPassDay('2026-10-13'); db.markPassDay('2026-10-14'); db.markPassDay('2026-10-15');
  assert.equal(db.streak('2026-10-15'), 3);
  assert.equal(db.streak('2026-10-16'), 3); // today not done yet: streak still alive
  assert.equal(db.streak('2026-10-17'), 0);
});
