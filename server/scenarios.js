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
      if (t?.run && !fs.existsSync(path.join(dir, t.run))) errs.push(`timeline[${i}] missing script ${t.run}`);
    });
  }
  for (const f of ['setup.sh', 'check.sh']) if (!fs.existsSync(path.join(dir, f))) errs.push(`missing ${f}`);
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
