import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const HOSTS = ['jump01', 'rtr01', 'web01', 'app01', 'db01', 'ns01'];
const ANSWER_TYPES = ['exact', 'regex', 'number', 'set'];
const WORDS = ['falcon', 'orbit', 'cedar', 'quartz', 'nimbus', 'ember', 'harbor', 'atlas', 'willow', 'cobalt', 'sierra', 'delta'];
const USERS = ['jenny', 'omar', 'liwei', 'carlos', 'fatima', 'noah', 'hana', 'pieter', 'grace', 'tariq'];

// mulberry32: small seeded PRNG so tests (and self-tests) are reproducible
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// ---- drill packs: compact one-host drills defined inline in scenarios/drills/*.yaml
// redirections/pipes go on the opening line: the terminator must stand alone
const heredoc = (host, body, after = '') => `on ${host} <<'__DRILL__'${after ? ' ' + after : ''}\n${String(body).trim()}\n__DRILL__`;
const oneLine = `| tr '\\n' ' ' | sed 's/ *$//'`;
const shq = (t) => `"${String(t).replace(/["\\$`]/g, '\\$&')}"`;

function drillToScenario(d) {
  const answerTask = !!d.answer;
  const inline = {
    'setup.sh': [heredoc(d.host, d.setup || 'true'), answerTask ? `echo "EXPECT=$(${heredoc(d.host, d.expect, oneLine)}\n)"` : ''].join('\n'),
    'check.sh': answerTask ? 'exit 0' : (d.checks || []).map(([cmd, msg]) => heredoc(d.host, cmd, `>/dev/null 2>&1 || fail ${shq(msg)}`)).join('\n') + '\nexit 0',
    'solve.sh': answerTask ? `echo "ANSWER=$(${heredoc(d.host, d.solve || d.expect, oneLine)}\n)"` : heredoc(d.host, d.solve || 'true'),
  };
  if (d.cleanup) inline['cleanup.sh'] = heredoc(d.host, d.cleanup);
  return {
    id: d.id, title: d.title, skills: d.skills || (d.skill ? [d.skill] : undefined), difficulty: d.difficulty,
    channel: d.channel, persona: d.persona, targets: d.host ? [d.host] : undefined,
    vars: { ...(d.vars || {}), ...(answerTask ? { EXPECT: { from_setup: true } } : {}) },
    message: d.message,
    secret_context: d.secret || (answerTask ? 'The correct answer is {{EXPECT}} (the requester only knows what they asked).' : 'The requester only knows what they described.'),
    answer: answerTask ? { type: d.answer, extract: d.extract || 'the requested value', value: '{{EXPECT}}', ...(d.tolerance ? { tolerance: d.tolerance } : {}) } : undefined,
    hints: d.hints, followup_minutes: d.followup_minutes, timeline: d.timeline,
    inline, solutionText: d.solution || '',
    _drillErrs: [!d.host && 'missing host', answerTask && !d.expect && 'answer drills need expect', !answerTask && !(d.checks || []).length && 'fix drills need checks'].filter(Boolean),
  };
}

function validate(s, dir, defs) {
  const errs = [];
  for (const k of ['id', 'title', 'skills', 'difficulty', 'channel', 'persona', 'targets', 'message', 'secret_context', 'hints'])
    if (s[k] === undefined || s[k] === null || s[k] === '') errs.push(`missing ${k}`);
  if (errs.length) return errs;
  if (!Array.isArray(s.skills) || !s.skills.length || s.skills.some((k) => !defs.skills.has(k))) errs.push(`unknown skill in ${JSON.stringify(s.skills)}`);
  if (!Number.isInteger(s.difficulty) || s.difficulty < 1 || s.difficulty > 5) errs.push('difficulty must be 1-5');
  if (s.channel !== 'dm' && !defs.channels.has(s.channel)) errs.push(`unknown channel ${s.channel}`);
  if (!defs.personas.has(s.persona)) errs.push(`unknown persona ${s.persona}`);
  if (!Array.isArray(s.targets) || s.targets.some((h) => !HOSTS.includes(h))) errs.push(`bad targets ${JSON.stringify(s.targets)}`);
  if (!Array.isArray(s.hints) || s.hints.length !== 3) errs.push('hints must have exactly 3 entries');
  if (s.answer && !ANSWER_TYPES.includes(s.answer.type)) errs.push(`answer.type must be one of ${ANSWER_TYPES}`);
  if (s.answer && !s.answer.value) errs.push('answer.value required');
  if (s.timeline !== undefined) {
    if (!Array.isArray(s.timeline)) errs.push('timeline must be a list');
    else s.timeline.forEach((t, i) => {
      if (!(typeof t?.at === 'number' && t.at > 0)) errs.push(`timeline[${i}].at must be minutes > 0`);
      if (!t?.text && !t?.run) errs.push(`timeline[${i}] needs text and/or run`);
      if (t?.text && !defs.personas.has(t.persona)) errs.push(`timeline[${i}] unknown persona ${t?.persona}`);
      if (t?.channel && !defs.channels.has(t.channel)) errs.push(`timeline[${i}] unknown channel ${t.channel}`);
      if (t?.run && !s.inline && !fs.existsSync(path.join(dir, t.run))) errs.push(`timeline[${i}] missing script ${t.run}`);
    });
  }
  if (s.inline) errs.push(...s._drillErrs);
  else for (const f of ['setup.sh', 'check.sh']) if (!fs.existsSync(path.join(dir, f))) errs.push(`missing ${f}`);
  const declared = new Set(Object.keys(s.vars || {}));
  const used = [s.message, s.secret_context, s.answer?.value || '', ...(Array.isArray(s.timeline) ? s.timeline.map((t) => t?.text || '') : [])].join(' ').matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  for (const [, v] of used) if (!declared.has(v)) errs.push(`undeclared var ${v}`);
  return errs;
}

function* scenarioDirs(root) {
  if (!fs.existsSync(root)) return;
  for (const skill of fs.readdirSync(root).sort()) {
    const sd = path.join(root, skill);
    if (!fs.statSync(sd).isDirectory()) continue;
    for (const id of fs.readdirSync(sd).sort()) {
      const d = path.join(sd, id);
      if (fs.existsSync(path.join(d, 'scenario.yaml'))) yield d;
    }
  }
}

export function loadScenarios(root, defs) {
  const scenarios = new Map();
  const warnings = [];
  for (const dir of scenarioDirs(root)) {
    const name = path.relative(root, dir);
    let s;
    try {
      s = YAML.parse(fs.readFileSync(path.join(dir, 'scenario.yaml'), 'utf8'));
    } catch (e) {
      warnings.push(`${name}: invalid yaml (${e.message.split('\n')[0]})`);
      continue;
    }
    const errs = validate(s || {}, dir, defs);
    if (!errs.length && scenarios.has(s.id)) errs.push(`duplicate id ${s.id}`);
    if (errs.length) { warnings.push(`${name}: ${errs.join('; ')}`); continue; }
    scenarios.set(s.id, { followup_minutes: s.alert ? 8 : 20, vars: {}, ...s, dir });
  }
  const drillDir = path.join(root, 'drills');
  if (fs.existsSync(drillDir)) {
    for (const file of fs.readdirSync(drillDir).filter((f) => f.endsWith('.yaml')).sort()) {
      let pack;
      try { pack = YAML.parse(fs.readFileSync(path.join(drillDir, file), 'utf8')) || []; }
      catch (e) { warnings.push(`drills/${file}: invalid yaml (${e.message.split('\n')[0]})`); continue; }
      for (const d of pack) {
        const s = drillToScenario(d || {});
        const errs = validate(s, drillDir, defs);
        if (!errs.length && scenarios.has(s.id)) errs.push(`duplicate id ${s.id}`);
        if (errs.length) { warnings.push(`drills/${file} ${d?.id ?? '?'}: ${errs.join('; ')}`); continue; }
        delete s._drillErrs;
        scenarios.set(s.id, { followup_minutes: 20, ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)), dir: drillDir });
      }
    }
  }
  return { scenarios, warnings };
}

export function resolveVars(scn, rng = Math.random) {
  const out = {};
  for (const [name, spec] of Object.entries(scn.vars || {})) {
    if (spec.from_setup) continue;
    if (spec.pick) out[name] = String(pick(spec.pick, rng));
    else if (spec.range) out[name] = String(spec.range[0] + Math.floor(rng() * (spec.range[1] - spec.range[0] + 1)));
    else if (spec.random === 'port') out[name] = String(20000 + Math.floor(rng() * 10000));
    else if (spec.random === 'user') out[name] = pick(USERS, rng);
    else if (spec.random === 'word') out[name] = pick(WORDS, rng);
    else if (spec.value !== undefined) out[name] = String(spec.value);
  }
  return out;
}

export function render(tpl, vars) {
  return String(tpl ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function mergeSetupOutput(scn, vars, stdout) {
  const allowed = new Set(Object.entries(scn.vars || {}).filter(([, s]) => s.from_setup).map(([k]) => k));
  const out = { ...vars };
  for (const line of String(stdout).split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m && allowed.has(m[1])) out[m[1]] = m[2].trim();
  }
  return out;
}
