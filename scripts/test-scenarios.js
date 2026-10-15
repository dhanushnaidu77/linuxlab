#!/usr/bin/env node
// Scenario self-test: for each scenario → reset targets → setup → check must FAIL → solve.sh → check must PASS → cleanup.
// usage: npm run test:scenarios [-- [--fast] [id-or-skill ...]]
// WARNING: recreates lab containers (cancels whatever you were doing in the lab).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../server/config.js';
import { loadDefs } from '../server/defs.js';
import { loadScenarios, resolveVars, render } from '../server/scenarios.js';
import { createRunner } from '../server/runner.js';
import { compareAnswer } from '../server/answers.js';

const cfg = loadConfig();
const args = process.argv.slice(2);
const fast = args.includes('--fast');
const filters = args.filter((a) => !a.startsWith('--'));
const defs = loadDefs(cfg.defsDir);
const { scenarios, warnings } = loadScenarios(cfg.scenariosDir, defs);
for (const w of warnings) console.log(`\x1b[33mLINT\x1b[0m ${w}`);
const runner = createRunner({ timeoutMs: 120_000, log: (m) => process.env.VERBOSE && console.log('   ', m) });
const selected = [...scenarios.values()].filter((s) => !filters.length || filters.some((f) => s.id === f || s.skills[0] === f || s.id.startsWith(f)));

function resetHosts(hosts) {
  execFileSync('docker', ['compose', 'up', '-d', '--force-recreate', '--no-deps', ...hosts], { cwd: path.join(cfg.root, 'lab'), stdio: 'ignore' });
  for (const h of hosts) {
    try { execFileSync('docker', ['exec', h, 'timeout', '90', 'systemctl', 'is-system-running', '--wait'], { stdio: 'ignore' }); } catch { /* degraded is reported by the check itself */ }
  }
}

const results = [];
for (const scn of selected) {
  const t0 = Date.now();
  const step = (s) => process.stdout.write(`\r\x1b[K${scn.id}: ${s}`);
  let ok = false, why = '';
  try {
    if (!fs.existsSync(path.join(scn.dir, 'solve.sh'))) throw new Error('missing solve.sh');
    if (!fast) { step('reset'); resetHosts(scn.targets); }
    step('setup');
    const vars = await runner.setup(scn, resolveVars(scn));
    for (const [k, spec] of Object.entries(scn.vars)) if (spec.from_setup && !(k in vars)) throw new Error(`setup did not output ${k}`);
    const expected = scn.answer ? render(scn.answer.value, vars) : null;

    step('check (expect fail)');
    const before = await runner.check(scn, vars, { ANSWER: 'definitely-wrong' });
    const wrongAnswerPasses = scn.answer && before.pass && compareAnswer(scn.answer.type, expected, 'definitely-wrong', { tolerance: scn.answer.tolerance || 0 });
    if (before.pass && (!scn.answer || wrongAnswerPasses)) throw new Error('check PASSED before solving');

    step('solve');
    const solved = await runner.optional(scn, 'solve.sh', vars);
    if (solved.code !== 0) throw new Error(`solve.sh exit ${solved.code}: ${(solved.stderr || solved.stdout).trim().slice(0, 300)}`);
    const answer = (solved.stdout.match(/^ANSWER=(.*)$/m) || [])[1]?.trim();

    step('check (expect pass)');
    const after = await runner.check(scn, vars, { ANSWER: answer ?? '' });
    if (!after.pass) throw new Error(`check FAILED after solve: ${after.reason}`);
    if (scn.answer && !compareAnswer(scn.answer.type, expected, answer, { tolerance: scn.answer.tolerance || 0 })) throw new Error(`answer "${answer}" != expected "${expected}"`);
    step('cleanup');
    await runner.optional(scn, 'cleanup.sh', vars);
    ok = true;
  } catch (e) {
    why = e.message;
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  process.stdout.write(`\r\x1b[K${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'} ${scn.id} (${secs}s)${why ? ` — ${why}` : ''}\n`);
  results.push(ok);
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} scenarios passed${warnings.length ? `, ${warnings.length} lint warnings` : ''}`);
process.exit(failed || warnings.length ? 1 : 0);
