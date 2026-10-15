// Integration test: requires the lab (scripts/lab up). Skips when jump01 is not running.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRunner, LabError } from '../server/runner.js';

const labUp = (() => { try { return execSync('docker inspect -f {{.State.Running}} jump01', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() === 'true'; } catch { return false; } })();

function scenario(files, vars = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scn-'));
  for (const [n, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), body);
  return { id: 'tmp', dir, vars };
}

test('setup output feeds from_setup vars; on forwards vars into the container', { skip: !labUp && 'lab not running' }, async () => {
  const r = createRunner();
  const scn = scenario({ 'setup.sh': `echo "GOT=$(on jump01 'echo -n $NAME-$(hostname)')"\n`, 'check.sh': 'exit 0' }, { GOT: { from_setup: true } });
  const vars = await r.setup(scn, { NAME: 'abc' });
  assert.equal(vars.GOT, 'abc-jump01');
});

test('check pass/fail with reason, and heredoc form of on', { skip: !labUp && 'lab not running' }, async () => {
  const r = createRunner();
  const ok = scenario({ 'check.sh': "on jump01 <<'X'\ntest -d /home/dhan\nX\n" });
  assert.deepEqual(await r.check(ok, {}), { pass: true, reason: '' });
  const bad = scenario({ 'check.sh': "on jump01 'test -e /nope' || fail 'file /nope missing'\n" });
  assert.deepEqual(await r.check(bad, {}), { pass: false, reason: 'file /nope missing' });
});

test('timeout is a failure', async () => {
  const r = createRunner({ timeoutMs: 300 });
  const scn = scenario({ 'check.sh': 'sleep 5' });
  assert.deepEqual(await r.check(scn, {}), { pass: false, reason: 'check timed out' });
});

test('missing container raises LabError', async () => {
  const r = createRunner();
  const scn = scenario({ 'check.sh': "on no-such-host-xyz 'true'" });
  await assert.rejects(r.check(scn, {}), LabError);
});
