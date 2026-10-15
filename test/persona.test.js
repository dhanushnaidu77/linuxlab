import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackIntent } from '../server/intent.js';
import { createPersonaEngine } from '../server/persona.js';

const persona = { id: 'marcus', name: 'Marcus Lee', role: 'SRE', style: 'terse', tech_level: 5 };
const ctx = { persona, title: 'Disk full', secret: 'the log is huge', history: [{ author: 'marcus', body: 'disk full on app01' }], message: 'done, cleaned it up', answerTask: false };

test('fallbackIntent recognises done-ish replies, questions, answers', () => {
  for (const t of ['done', 'Fixed it!', 'should be good now', 'all set 👍', 'restarted the service', 'killed it', 'ok it is resolved'])
    assert.equal(fallbackIntent(t, false), 'done', t);
  assert.equal(fallbackIntent('which server is it on?', false), 'question');
  assert.equal(fallbackIntent('lol', false), 'other');
  assert.equal(fallbackIntent('its PID 4242', true), 'answer');
  assert.equal(fallbackIntent('which box?', true), 'question');
});

test('no api key → offline engine with fallback classify and canned replies', async () => {
  const e = createPersonaEngine({ apiKey: '' });
  assert.equal(e.online, false);
  assert.deepEqual(await e.classify(ctx), { intent: 'done', extracted: 'done, cleaned it up' });
  const fail = await e.reply(ctx, 'fail', { reason: 'disk still 98% full' });
  assert.match(fail, /98% full/);
  assert.ok((await e.reply(ctx, 'pass')).length > 0);
  assert.ok((await e.reply(ctx, 'nudge')).length > 0);
});

test('client errors fall back gracefully', async () => {
  const client = { messages: { create: async () => { throw new Error('boom'); } } };
  const e = createPersonaEngine({ apiKey: 'k', client });
  assert.equal((await e.classify(ctx)).intent, 'done');
  assert.match(await e.reply(ctx, 'fail', { reason: 'nope' }), /nope/);
});

test('structured classify output is parsed and validated', async () => {
  const calls = [];
  const client = { messages: { create: async (req) => { calls.push(req); return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ intent: 'answer', extracted_answer: '4242' }) }] }; } } };
  const e = createPersonaEngine({ apiKey: 'k', client, model: 'm' });
  assert.deepEqual(await e.classify({ ...ctx, answerTask: true, message: 'pid is 4242' }), { intent: 'answer', extracted: '4242' });
  assert.equal(calls[0].model, 'm');
  assert.equal(calls[0].output_config.format.type, 'json_schema');
});

test('invalid intent from model falls back', async () => {
  const client = { messages: { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"intent":"banana"}' }] }) } };
  const e = createPersonaEngine({ apiKey: 'k', client });
  assert.equal((await e.classify(ctx)).intent, 'done');
});

test('reply uses model text when available', async () => {
  const client = { messages: { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'nice, thx' }] }) } };
  const e = createPersonaEngine({ apiKey: 'k', client });
  assert.equal(await e.reply(ctx, 'pass'), 'nice, thx');
});
