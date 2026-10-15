import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';
import { mergeSetupOutput } from './scenarios.js';

const HELPERS = path.join(ROOT, 'lib', 'check-helpers.sh');
const INFRA_ERR = /is not running|No such container|Cannot connect to the Docker daemon|permission denied while trying to connect/i;

export class LabError extends Error {}

// Runs a scenario script on the console host with helpers sourced and vars in env.
function runScript(file, vars, { timeoutMs, extraEnv = {} }) {
  return new Promise((resolve) => {
    const env = { PATH: process.env.PATH, HOME: process.env.HOME, LAB_VARS: Object.keys(vars).join(' '), ...vars, ...extraEnv, HELPERS, SCRIPT: file };
    const child = spawn('bash', ['-c', 'set -o pipefail; . "$HELPERS"; . "$SCRIPT"'], { cwd: path.dirname(file), env, detached: true });
    let stdout = '', stderr = '', timedOut = false;
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, timeoutMs);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: timedOut ? -1 : code, stdout, stderr, timedOut }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: String(e), timedOut: false }); });
  });
}

export function createRunner({ timeoutMs = 30_000, log = () => {} } = {}) {
  const fileOf = (scn, name) => path.join(scn.dir, name);
  const exists = (scn, name) => fs.existsSync(fileOf(scn, name));

  async function run(scn, name, vars, extraEnv) {
    const r = await runScript(fileOf(scn, name), vars, { timeoutMs, extraEnv });
    if (r.stderr.trim()) log(`[${scn.id}/${name}] stderr: ${r.stderr.trim().slice(0, 500)}`);
    if (INFRA_ERR.test(r.stderr)) throw new LabError(`lab unavailable: ${r.stderr.trim().split('\n')[0]}`);
    return r;
  }

  return {
    exists,
    async setup(scn, vars) {
      const r = await run(scn, 'setup.sh', vars);
      if (r.code !== 0) throw new Error(`setup failed (${r.timedOut ? 'timeout' : `exit ${r.code}`}): ${(r.stderr || r.stdout).trim().slice(0, 300)}`);
      return mergeSetupOutput(scn, vars, r.stdout);
    },
    async check(scn, vars, extraEnv = {}) {
      const r = await run(scn, 'check.sh', vars, extraEnv);
      if (r.code === 0) return { pass: true, reason: '' };
      const reason = r.timedOut ? 'check timed out' : r.stdout.split('\n').map((l) => l.trim()).find(Boolean) || 'still not working';
      return { pass: false, reason };
    },
    async optional(scn, name, vars) {
      if (!exists(scn, name)) return null;
      return run(scn, name, vars);
    },
  };
}
