// Keyword fallback used when the persona LLM is unavailable.
const DONE = /\b(done|fixed|finished|resolved|sorted|all set|should be (good|ok|fine|working)|it'?s (up|back|working)|killed|restarted|cleaned|deleted|removed|created|changed|updated|added|ok now|try (it )?(now|again))\b/i;

export function fallbackIntent(text, answerTask) {
  const t = String(text || '').trim();
  if (/\?\s*$/.test(t)) return 'question';
  if (DONE.test(t)) return answerTask ? 'answer' : 'done';
  return answerTask && t.length > 0 ? 'answer' : 'other';
}
