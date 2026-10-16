import Anthropic from '@anthropic-ai/sdk';
import { fallbackIntent } from './intent.js';

const INTENTS = ['question', 'done', 'answer', 'other'];

const CANNED = {
  pass: ['thanks!! 🙏', 'perfect, that did it. thank you', 'confirmed on my side, appreciate it', 'legend, thanks'],
  fail: (r) => [`hmm still not right on my end: ${r}`, `doesn't look fixed yet — ${r}`, `still seeing it: ${r}`],
  nudge: ['any update on this?', 'hey, any luck with this one?', 'bumping this — still an issue'],
  converse: ["sorry, slammed rn — can I get back to you in a bit?", "in a meeting, will reply after 🙏", "give me 10 min"],
  chat: ["not sure tbh — I only know what I wrote above. can you take a look?", "I don't know more than what I said, sorry 🤷", 'no idea, that\'s why I pinged you 😅'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function systemPrompt({ persona, title, secret }) {
  return [
    `You are role-playing ${persona.name}, ${persona.role} at Darkroom Labs, chatting in the company Slack with a colleague (the user) who is the go-to Linux/infra person.`,
    `Your personality and writing style: ${persona.style}`,
    `Your technical level is ${persona.tech_level}/5 — never use knowledge beyond it.`,
    `The request you made: "${title}".`,
    `Private background (what is really going on — the user must discover it themselves): ${secret}`,
    'Rules: stay in character; write like a real chat message (1-3 short lines, no markdown headers); only reveal details your character would plausibly know from the background;',
    'never give away the fix, root cause, exact commands or file paths your character would not know; never mention that this is a training exercise or that you are an AI.',
  ].join('\n');
}

const transcript = (history, persona) =>
  history.map((m) => `${m.author === 'me' ? 'Colleague' : m.author === persona.id ? persona.name : m.author}: ${m.body}`).join('\n') || '(no messages yet)';

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: INTENTS },
    extracted_answer: { type: ['string', 'null'] },
  },
  required: ['intent', 'extracted_answer'],
  additionalProperties: false,
};

export function createPersonaEngine({ apiKey, model = 'claude-haiku-5-5', client, timeoutMs = 10_000, log = () => {} }) {
  const api = client || (apiKey ? new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 }) : null);
  const online = !!api;

  async function call({ output_config, ...req }) {
    const res = await api.messages.create({ model, max_tokens: 2000, ...req, output_config: { effort: 'low', ...output_config } });
    if (res.stop_reason === 'refusal') throw new Error('refusal');
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (!text) throw new Error(`empty response (${res.stop_reason})`);
    return text;
  }

  async function classify(ctx) {
    const fallback = () => ({ intent: fallbackIntent(ctx.message, ctx.answerTask), extracted: ctx.message });
    if (!online) return fallback();
    try {
      const text = await call({
        system: [
          'You classify a chat reply from an ops engineer to a coworker\'s request.',
          `The request: "${ctx.title}". ${ctx.answerTask ? `The coworker wants a specific piece of information: ${ctx.extract}.` : 'The coworker wants something fixed or changed.'}`,
          'intent: "done" = the engineer says they completed/fixed it; "answer" = the engineer provides the requested information',
          '(use only when information was requested); "question" = asks for details/clarification; "other" = anything else.',
          'extracted_answer: when intent is "answer", the requested value exactly as written by the engineer (no extra words), else null.',
        ].join('\n'),
        messages: [{ role: 'user', content: `Conversation so far:\n${transcript(ctx.history, ctx.persona)}\n\nEngineer's new reply:\n${ctx.message}` }],
        output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
      });
      const parsed = JSON.parse(text);
      if (!INTENTS.includes(parsed.intent)) throw new Error(`bad intent ${parsed.intent}`);
      // a done-with-value on an answer task is still an answer
      const intent = ctx.answerTask && parsed.intent === 'done' ? 'answer' : parsed.intent;
      return { intent, extracted: parsed.extracted_answer ?? ctx.message };
    } catch (e) {
      log(`persona classify fallback: ${e.message}`);
      return fallback();
    }
  }

  async function reply(ctx, kind, extra = {}) {
    const canned = () => (kind === 'fail' ? pick(CANNED.fail(extra.reason || 'still broken')) : pick(CANNED[kind] || CANNED.chat));
    if (!online) return canned();
    const instruction = {
      chat: 'Reply in character to the colleague\'s latest message.',
      pass: 'The colleague finished the request and it is verified working. Reply in character: brief thanks / confirmation.',
      fail: `The colleague said it is done/answered, but it is NOT right. From your side you observe: "${extra.reason}". Reply in character saying it's still not right, describing that symptom in your own words. Do not reveal the fix.`,
      nudge: 'The colleague has gone quiet for a while. Send a short in-character follow-up asking for an update.',
    }[kind];
    try {
      return await call({
        system: systemPrompt(ctx),
        messages: [{ role: 'user', content: `Chat so far:\n${transcript(ctx.history, ctx.persona)}\n\n${instruction}\nOutput only the chat message text.` }],
      });
    } catch (e) {
      log(`persona reply fallback: ${e.message}`);
      return canned();
    }
  }

  // free-form conversation in a DM or channel (not tied to one ticket thread)
  async function converse(ctx) {
    if (!online) return pick(CANNED.converse);
    const p = ctx.persona;
    const system = [
      `You are role-playing ${p.name}, ${p.role} at Darkroom Labs, chatting on the company Slack with a colleague (the user, @dhan),`,
      'who is the go-to Linux/infra engineer.',
      `Your personality and writing style: ${p.style}`,
      `Your technical level is ${p.tech_level}/5 — never use knowledge beyond it.`,
      `You are talking in ${ctx.place}.`,
      ctx.knowledge ? `What you know right now (use it naturally, only if relevant):\n${ctx.knowledge}` : '',
      p.teacher
        ? 'Rules: stay in character; write like a real chat message (no markdown headers). General questions: explain clearly in up to ~8 short lines, inline `code` for commands. Open problems: pointers only, never the hidden root cause or exact fix commands.'
        : 'Rules: stay in character; write like a real chat message (1-3 short lines, no markdown headers); never reveal hidden root causes or exact fix commands for open problems.',
      'Never mention that this is a training exercise or that you are an AI.',
    ].filter(Boolean).join('\n');
    try {
      return await call({
        system,
        messages: [{ role: 'user', content: `Conversation so far:\n${transcript(ctx.history, p)}\n\nReply in character to the colleague's latest message. Output only the chat message text.` }],
      });
    } catch (e) {
      log(`persona converse fallback: ${e.message}`);
      return pick(CANNED.converse);
    }
  }

  return { online, classify, reply, converse };
}
