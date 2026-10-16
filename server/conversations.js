// Slack-style free conversation: posting in channels/DMs, @mentions, forwarding.
import { render } from './scenarios.js';

const isBot = (p) => p.id === 'alertbot';
const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

export function mentionedPersona(text, defs) {
  for (const m of String(text).matchAll(/@([a-z][\w.-]*)/gi)) {
    const word = m[1].toLowerCase();
    const p = [...defs.personas.values()].find((x) => !isBot(x) && (x.id === word || x.name.split(' ')[0].toLowerCase() === word));
    if (p) return p;
  }
  return null;
}

export function createConversations({ db, defs, scenarios, tm, persona, broadcast, openers = {}, now = Date.now, log = () => {} }) {
  const post = (fields) => {
    const m = db.addMessage({ ...fields, now: now() });
    broadcast({ type: 'message', message: m });
    return m;
  };

  function validTarget(channel) {
    if (defs.channels.has(channel)) return true;
    const p = channel.startsWith('dm:') && defs.personas.get(channel.slice(3));
    return !!p && !isBot(p);
  }

  // what a persona plausibly knows: their own open tickets fully, other tickets only as a hunch (first hint)
  function knowledgeFor(p, extraTaskIds = []) {
    const lines = [];
    // a question this persona asked you in DMs: what a good answer covers, so they can react to yours
    const lastQ = db.messages({ channel: `dm:${p.id}`, limit: 30 }).filter((m) => m.author === p.id && m.meta?.opener != null).at(-1);
    const item = lastQ && openers[p.id]?.[lastQ.meta.opener];
    if (item?.a) lines.push(`- You asked the colleague: "${item.q}". What a correct answer covers (you do NOT know this yourself; use it only to judge whether their explanation makes sense): ${item.a}`);
    for (const t of tm.openTasksFor(p.id)) {
      const scn = scenarios.get(t.scenarioId);
      if (scn) lines.push(`- Your open request "${render(scn.title, t.vars)}" (posted in ${t.channel}). Background: ${render(scn.secret_context, t.vars).trim()}`);
    }
    for (const id of extraTaskIds) {
      const t = db.getTask(id);
      const scn = t && scenarios.get(t.scenarioId);
      if (!scn || t.persona === p.id) continue;
      const hunch = p.tech_level >= 4 ? ` Your educated guess about where to look: ${render(scn.hints[0], t.vars)}` : '';
      lines.push(`- A request from ${defs.personas.get(t.persona)?.name ?? t.persona}: "${render(scn.title, t.vars)}" (status: ${t.state}).${hunch}`);
    }
    return lines.join('\n');
  }

  const asHistory = (msgs) => msgs.filter((m) => m.kind === 'msg' || m.kind === 'forward').map((m) => ({
    author: m.author,
    body: m.kind === 'forward' ? `[forwarded a message from ${defs.personas.get(m.meta?.from)?.name ?? m.meta?.from}: "${m.meta?.body}"] ${m.body}` : m.body,
  }));

  async function respond(p, channel) {
    broadcast({ type: 'typing', channel, persona: p.id });
    const recent = db.messages({ channel, limit: 20 });
    const forwardedTasks = recent.filter((m) => m.kind === 'forward' && m.meta?.taskId).map((m) => m.meta.taskId);
    const body = await persona.converse({
      persona: p,
      place: channel.startsWith('dm:') ? 'a private direct message' : `the #${channel} channel`,
      knowledge: knowledgeFor(p, [...new Set(forwardedTasks)]),
      history: asHistory(recent),
    });
    return post({ channel, author: p.id, body });
  }

  async function postMessage({ channel, text }) {
    text = String(text || '').trim().slice(0, 4000);
    if (!text) throw bad('empty message');
    if (!validTarget(channel)) throw bad(`unknown channel ${channel}`);
    const target = channel.startsWith('dm:') ? defs.personas.get(channel.slice(3)) : mentionedPersona(text, defs);

    // DM to someone with an open ticket: it's about the ticket (follow-ups, "done", answers)
    if (channel.startsWith('dm:')) {
      const [task] = tm.openTasksFor(target.id).filter((t) => !tm.isBusy(t.id));
      if (task) return tm.reply(task.id, text, { via: channel });
    }
    post({ channel, author: 'me', body: text });
    if (target) await respond(target, channel);
    return {};
  }

  async function forward({ messageId, to, note = '' }) {
    const orig = db.getMessage(Number(messageId));
    if (!orig) throw bad('message not found');
    if (!validTarget(to)) throw bad(`unknown destination ${to}`);
    const taskId = orig.taskId ?? orig.meta?.re ?? orig.meta?.taskId ?? null;
    post({
      channel: to, author: 'me', kind: 'forward', body: String(note).trim().slice(0, 2000),
      meta: { from: orig.author, channel: orig.channel, body: orig.kind === 'forward' ? orig.meta?.body : orig.body, at: orig.at, taskId },
    });
    const target = to.startsWith('dm:') ? defs.personas.get(to.slice(3)) : mentionedPersona(note, defs);
    if (target) await respond(target, to);
    return {};
  }

  return { post: postMessage, forward, validTarget };
}
