import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadDefs } from '../server/defs.js';
import { loadScenarios, resolveVars, render, mergeSetupOutput, seededRng } from '../server/scenarios.js';
import { ROOT } from '../server/config.js';

const defs = loadDefs(path.join(ROOT, 'data-defs'));
const fixtures = path.join(ROOT, 'test/fixtures/scenarios');

test('defs load personas, channels, skills', () => {
  assert.ok(defs.personas.get('marcus'));
  assert.ok(defs.channels.get('netops'));
  assert.equal(defs.skills.get('dns').tier, 3);
});

test('valid scenario loads, invalid ones are skipped with warnings', () => {
  const { scenarios, warnings } = loadScenarios(fixtures, defs);
  assert.deepEqual([...scenarios.keys()].filter((k) => !k.startsWith('drill-')), ['good']);
  assert.ok(scenarios.get('good').dir.endsWith('files/good'));
  const w = warnings.join('\n');
  assert.match(w, /bad-yaml/);
  assert.match(w, /no-check.*check\.sh/);
  assert.match(w, /bad-persona.*persona/);
  assert.match(w, /two-hints.*hints/);
});

test('resolveVars is deterministic with a seeded rng and respects types', () => {
  const scn = loadScenarios(fixtures, defs).scenarios.get('good');
  const a = resolveVars(scn, seededRng(42));
  const b = resolveVars(scn, seededRng(42));
  assert.deepEqual(a, b);
  assert.ok(['alpha', 'beta'].includes(a.NAME));
  assert.ok(Number(a.PORT) >= 20000 && Number(a.PORT) <= 20010);
  assert.equal('SECRET' in a, false);
});

test('render substitutes known vars and leaves unknown visible', () => {
  assert.equal(render('hi {{A}} {{B}}', { A: 'x' }), 'hi x {{B}}');
  assert.equal(render('{{ A }}', { A: 'y' }), 'y');
});

test('mergeSetupOutput only takes declared from_setup vars', () => {
  const scn = loadScenarios(fixtures, defs).scenarios.get('good');
  const v = mergeSetupOutput(scn, { NAME: 'alpha' }, 'noise\nSECRET=abc123\nNAME=hacked\nOTHER=1\n');
  assert.deepEqual(v, { NAME: 'alpha', SECRET: 'abc123' });
});

test('drill packs become scenarios with inline scripts; invalid drills are reported', () => {
  const { scenarios, warnings } = loadScenarios(fixtures, defs);
  const c = scenarios.get('drill-count');
  assert.ok(c, 'drill-count loaded');
  assert.equal(c.answer.type, 'number');
  assert.equal(c.answer.value, '{{EXPECT}}');
  assert.ok(c.vars.EXPECT.from_setup);
  assert.match(c.inline['setup.sh'], /on app01 <<'__DRILL__'/);
  assert.match(c.inline['setup.sh'], /EXPECT=/);
  assert.equal(c.inline['check.sh'].trim(), 'exit 0');
  assert.match(c.inline['solve.sh'], /ANSWER=/);
  assert.equal(c.solutionText, 'use `ls | wc -l`');
  const f = scenarios.get('drill-fix');
  assert.match(f.inline['check.sh'], /test -x \/tmp\/x.sh/);
  assert.match(f.inline['check.sh'], /<<'__DRILL__' >\/dev\/null 2>&1 \|\| fail "still not executable"\n/);
  assert.ok(!scenarios.has('drill-bad'));
  assert.match(warnings.join('\n'), /drill-bad.*hints/);
});
