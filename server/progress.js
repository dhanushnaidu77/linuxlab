// Pure progress math: mastery, XP, decay, unlocks, levels.
const DAY = 86400000;
const hintFactor = (hints) => Math.max(0, 1 - 0.25 * hints);

export const masteryGain = (difficulty, hints) => Math.round(10 * difficulty * hintFactor(hints));
export const applyGain = (score, gain) => Math.min(100, Math.max(0, score + gain));
export const xpReward = (difficulty, hints) => Math.round(50 * difficulty * hintFactor(hints));
export const SKIP_PENALTY = 2;
export const UNLOCK_AT = 30;

export function decay(score, lastPracticed, now) {
  if (lastPracticed == null) return score;
  const days = Math.floor((now - lastPracticed) / DAY);
  return days <= 7 ? score : Math.max(0, score - (days - 7));
}

// skill level 1..5 used to pick an appropriate difficulty
export const skillLevel = (score = 0) => Math.min(5, 1 + Math.floor(score / 25));

export function unlocked(skills, mastery) {
  const out = new Set();
  for (const [id, s] of skills) if ((s.requires || []).every((r) => (mastery[r] ?? 0) >= UNLOCK_AT)) out.add(id);
  return out;
}

export const level = (xp) => 1 + Math.floor(Math.sqrt(xp / 100));
