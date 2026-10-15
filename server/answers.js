// Deterministic answer checking. `loose` is used when the value could not be extracted
// cleanly (offline fallback) and the whole chat message is searched instead.
const norm = (s) => String(s ?? '').trim().replace(/^[`'"]+|[`'"]+$/g, '').trim().toLowerCase();
const tokens = (s) => norm(s).split(/[\s,;]+/).map((t) => t.replace(/^[`'"(]+|[`'".,)!]+$/g, '')).filter(Boolean);

export function compareAnswer(type, expected, actual, { loose = false, tolerance = 0 } = {}) {
  if (!norm(actual)) return false;
  switch (type) {
    case 'exact':
      return loose ? tokens(actual).includes(norm(expected)) : norm(actual) === norm(expected);
    case 'regex':
      return new RegExp(expected, 'i').test(String(actual).trim());
    case 'number': {
      const nums = (String(actual).match(/-?\d+(\.\d+)?/g) || []).map(Number);
      const want = Number(expected);
      const cands = loose ? nums : nums.slice(0, 1);
      return cands.some((n) => Math.abs(n - want) <= tolerance);
    }
    case 'set': {
      const want = new Set(tokens(expected));
      const got = new Set(tokens(actual));
      const allPresent = [...want].every((t) => got.has(t));
      return loose ? allPresent : allPresent && got.size === want.size;
    }
    default:
      return false;
  }
}
