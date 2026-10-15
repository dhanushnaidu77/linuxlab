import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareAnswer } from '../server/answers.js';

test('exact: trims, ignores case, quotes and backticks', () => {
  assert.ok(compareAnswer('exact', 'nginx', ' `NGINX` '));
  assert.ok(!compareAnswer('exact', 'nginx', 'it is nginx'));
  assert.ok(compareAnswer('exact', 'nginx', 'it is nginx', { loose: true }));
  assert.ok(!compareAnswer('exact', 'nginx', 'it is nginx2', { loose: true }));
});

test('regex', () => {
  assert.ok(compareAnswer('regex', '^/var/log/.*\\.log$', '/var/log/app.log'));
  assert.ok(!compareAnswer('regex', '^/var/log/.*\\.log$', '/tmp/x'));
});

test('number with tolerance; loose finds any number', () => {
  assert.ok(compareAnswer('number', '4242', '4242'));
  assert.ok(compareAnswer('number', '100', '103', { tolerance: 5 }));
  assert.ok(!compareAnswer('number', '100', '110', { tolerance: 5 }));
  assert.ok(compareAnswer('number', '4242', 'the pid is 4242 I think', { loose: true }));
  assert.ok(!compareAnswer('number', '4242', 'abc'));
});

test('set: order-insensitive, comma or space separated', () => {
  assert.ok(compareAnswer('set', 'a,b,c', 'c b a'));
  assert.ok(compareAnswer('set', 'a,b,c', 'a, c, b'));
  assert.ok(!compareAnswer('set', 'a,b,c', 'a b'));
  assert.ok(!compareAnswer('set', 'a,b', 'a b c'));
  assert.ok(compareAnswer('set', 'a,b', 'users are a and b', { loose: true }));
});

test('empty actual never passes', () => {
  for (const t of ['exact', 'regex', 'number', 'set']) assert.ok(!compareAnswer(t, 'x', ''));
});
