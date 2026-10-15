import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDotEnv, loadConfig } from '../server/config.js';

test('parseDotEnv handles comments, blanks and quotes', () => {
  const env = parseDotEnv(`# comment\n\nA=1\nB="two words"\nC='x=y'\n  D = spaced \n`);
  assert.deepEqual(env, { A: '1', B: 'two words', C: 'x=y', D: 'spaced' });
});

test('loadConfig applies defaults', () => {
  const c = loadConfig({});
  assert.equal(c.port, 8088);
  assert.equal(c.model, 'claude-haiku-5-5');
  assert.equal(c.anthropicKey, '');
  assert.ok(c.root.endsWith('linuxlab') || c.root.length > 0);
});

test('loadConfig reads overrides', () => {
  const c = loadConfig({ PORT: '9000', ANTHROPIC_API_KEY: 'k', LAB_MODEL: 'm' });
  assert.equal(c.port, 9000);
  assert.equal(c.anthropicKey, 'k');
  assert.equal(c.model, 'm');
});
