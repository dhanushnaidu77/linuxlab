import { skillLevel } from './progress.js';

const weightedPick = (items, weight, rng) => {
  const total = items.reduce((t, x) => t + weight(x), 0);
  let r = rng() * total;
  for (const x of items) if ((r -= weight(x)) < 0) return x;
  return items[items.length - 1];
};

// share of tickets that are deliberately easy (difficulty <= 2) regardless of level — real work has quick ones too
export const EASY_SHARE = 0.2;

// mastery: { skillId: number }. Primary skill (skills[0]) decides eligibility and weighting.
export function pickScenario({ scenarios, mastery, unlocked, recentIds, rng = Math.random }) {
  const all = [...(scenarios.values ? scenarios.values() : scenarios)];
  const recent = new Set(recentIds);
  const open = all.filter((s) => unlocked.has(s.skills[0]) && !recent.has(s.id));
  if (!open.length) return null;
  const easy = open.filter((s) => s.difficulty <= 2);
  if (easy.length && rng() < EASY_SHARE) return easy[Math.floor(rng() * easy.length)];
  const inBand = open.filter((s) => Math.abs(s.difficulty - skillLevel(mastery[s.skills[0]])) <= 1);
  const pool = inBand.length ? inBand : open;

  if (rng() < 0.3) return pool[Math.floor(rng() * pool.length)];
  const skills = [...new Set(pool.map((s) => s.skills[0]))];
  const skill = weightedPick(skills, (k) => 105 - (mastery[k] ?? 0), rng);
  const forSkill = pool.filter((s) => s.skills[0] === skill);
  return forSkill[Math.floor(rng() * forSkill.length)];
}
