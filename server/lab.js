import { execFile } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './config.js';
import { HOSTS } from './scenarios.js';

const LAB_SCRIPT = path.join(ROOT, 'scripts', 'lab');

const run = (cmd, args, timeout) => new Promise((resolve) => {
  execFile(cmd, args, { timeout, cwd: ROOT }, (err, stdout, stderr) => resolve({ ok: !err, stdout: String(stdout), stderr: String(stderr || err?.message || '') }));
});

export async function labStatus() {
  const r = await run('docker', ['inspect', '-f', '{{.Name}} {{.State.Running}}', ...HOSTS], 10_000);
  const running = Object.fromEntries(HOSTS.map((h) => [h, false]));
  for (const line of r.stdout.split('\n')) {
    const [name, state] = line.trim().split(' ');
    if (name) running[name.replace(/^\//, '')] = state === 'true';
  }
  const up = Object.values(running).every(Boolean);
  return { status: up ? 'online' : 'offline', hosts: running };
}

// host must be one of HOSTS (validated here, never passed through from the client unchecked)
export async function labReset(host = null) {
  if (host && !HOSTS.includes(host)) return { ok: false, stderr: 'unknown host' };
  return run(LAB_SCRIPT, host ? ['reset', host] : ['reset'], 300_000);
}

export const labStart = () => run(LAB_SCRIPT, ['up'], 300_000);
