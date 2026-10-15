import fs from 'node:fs';
import path from 'node:path';
import { resolveVars, render } from './scenarios.js';
import { pickScenario } from './scheduler.js';
import { compareAnswer } from './answers.js';
import { LabError } from './runner.js';
import * as P from './progress.js';

const MAX_OPEN = 3;
const MAX_NUDGES = 2;
const MAX_SPAWN_TRIES = 3;
const DEFAULT_INTERVAL = { min: 5, max: 20 }; // minutes
const CHAT_KINDS = new Set(['msg']);

const channelFor = (scn) => (scn.channel === 'dm' ? `dm:${scn.persona}` : scn.channel);
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const defaultReadSolution = (scn) => {
  const f = path.join(scn.dir, 'solution.md');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '_No solution notes for this scenario._';
};

export function createTaskManager({ db, defs, scenarios, runner, persona, broadcast, rng = Math.random, now = Date.now, log = () => {}, readSolution = defaultReadSolution }) {
  let clientCount = 0;
  let nextSpawnAt = null;
  const busy = new Set();

  const post = (fields) => {
    const m = db.addMessage({ ...fields, now: now() });
    broadcast({ type: 'message', message: m });
    return m;
  };
  const taskChanged = (id) => broadcast({ type: 'task', task: summary(db.getTask(id)) });

  function summary(t) {
    if (!t) return null;
    const scn = scenarios.get(t.scenarioId);
    return { ...t, title: scn ? render(scn.title, t.vars) : t.scenarioId, difficulty: scn?.difficulty, skills: scn?.skills || [], hintsLeft: 3 - t.hintsUsed, answerTask: !!scn?.answer };
  }

  function effectiveMastery() {
    const raw = db.getMastery();
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, P.decay(v.score, v.lastPracticed, now())]));
  }

  function personaCtx(task, scn, message) {
    const p = defs.personas.get(scn.persona);
    const history = db.messages({ taskId: task.id }).filter((m) => CHAT_KINDS.has(m.kind) && m.author !== 'system').map((m) => ({ author: m.author, body: m.body }));
    return {
      persona: p, title: render(scn.title, task.vars), secret: render(scn.secret_context, task.vars),
      history, message, answerTask: !!scn.answer, extract: scn.answer?.extract,
    };
  }

  function labOffline(err) {
    log(`lab error: ${err.message}`);
    broadcast({ type: 'lab', status: 'offline', error: err.message });
  }

  async function spawn({ force = false, scenarioId = null } = {}) {
    if (!force && (db.getSetting('paused', false) || db.openTasks().length >= MAX_OPEN)) return null;
    const tried = new Set();
    for (let attempt = 0; attempt < MAX_SPAWN_TRIES; attempt++) {
      const mastery = effectiveMastery();
      const scn = scenarioId ? scenarios.get(scenarioId) : pickScenario({
        scenarios: [...scenarios.values()].filter((s) => !tried.has(s.id)),
        mastery, unlocked: P.unlocked(defs.skills, mastery), recentIds: db.recentScenarioIds(10), rng,
      });
      if (!scn) return null;
      tried.add(scn.id);
      const channel = channelFor(scn);
      let vars = resolveVars(scn, rng);
      const id = db.createTask({ scenarioId: scn.id, vars, channel, persona: scn.persona, now: now() });
      try {
        vars = await runner.setup(scn, vars);
      } catch (e) {
        db.updateTask(id, { state: 'error', closedAt: now() });
        if (e instanceof LabError) { labOffline(e); return null; }
        log(`setup failed for ${scn.id}: ${e.message}`);
        if (scenarioId) return null;
        continue;
      }
      db.updateTask(id, { vars, state: 'open', lastActivity: now() });
      post({ channel, taskId: id, author: scn.persona, body: render(scn.message, vars) });
      taskChanged(id);
      return summary(db.getTask(id));
    }
    return null;
  }

  function award(task, scn) {
    const xp = P.xpReward(scn.difficulty, task.hintsUsed);
    const mastery = effectiveMastery();
    scn.skills.forEach((skill, i) => {
      const gain = P.masteryGain(scn.difficulty, task.hintsUsed) / (i === 0 ? 1 : 2);
      db.setMastery(skill, P.applyGain(mastery[skill] ?? 0, Math.round(gain)), now());
    });
    db.markPassDay(dayOf(now()));
    return xp;
  }

  async function close(task, scn, state) {
    db.updateTask(task.id, { state, closedAt: now() });
    taskChanged(task.id);
    post({ channel: task.channel, taskId: task.id, author: 'system', kind: 'solution', body: render(readSolution(scn), task.vars) });
    broadcast({ type: 'progress' });
    try { await runner.optional(scn, 'cleanup.sh', task.vars); } catch (e) { log(`cleanup failed for ${scn.id}: ${e.message}`); }
  }

  async function runChecks(task, scn, extracted, loose) {
    const result = await runner.check(scn, task.vars, { ANSWER: extracted ?? '' });
    if (!result.pass || !scn.answer) return result;
    const expected = render(scn.answer.value, task.vars);
    const ok = compareAnswer(scn.answer.type, expected, extracted, { loose, tolerance: scn.answer.tolerance || 0 });
    return ok ? result : { pass: false, reason: `the value "${String(extracted).slice(0, 80)}" doesn't match what I'm seeing` };
  }

  async function reply(taskId, text) {
    const task = db.getTask(taskId);
    if (!task || !['open'].includes(task.state)) return { error: 'task is not open' };
    if (busy.has(taskId)) return { error: 'still processing your last message' };
    const scn = scenarios.get(task.scenarioId);
    busy.add(taskId);
    try {
      post({ channel: task.channel, taskId, author: 'me', body: text });
      db.updateTask(taskId, { lastActivity: now() });
      if (!scn) { post({ channel: task.channel, taskId, author: 'system', body: 'This scenario no longer exists; skipping.' }); db.updateTask(taskId, { state: 'error', closedAt: now() }); taskChanged(taskId); return {}; }

      broadcast({ type: 'typing', taskId, persona: scn.persona });
      const ctx = personaCtx(task, scn, text);
      const { intent, extracted } = await persona.classify(ctx);
      if (intent !== 'done' && intent !== 'answer') {
        post({ channel: task.channel, taskId, author: scn.persona, body: await persona.reply(ctx, 'chat') });
        return { intent };
      }

      db.updateTask(taskId, { state: 'checking' });
      taskChanged(taskId);
      let result;
      try {
        result = await runChecks(task, scn, extracted, !persona.online);
      } catch (e) {
        db.updateTask(taskId, { state: 'open' });
        taskChanged(taskId);
        if (e instanceof LabError) labOffline(e); else log(`check crashed for ${scn.id}: ${e.message}`);
        post({ channel: task.channel, taskId, author: 'system', body: `⚠️ Couldn't run the verification (${e.message}). Is the lab up? Try again in a moment.` });
        return { intent, error: e.message };
      }
      db.addAttempt(taskId, result.pass, result.reason, now());
      const fresh = personaCtx(db.getTask(taskId), scn, text);
      if (!result.pass) {
        db.updateTask(taskId, { state: 'open' });
        post({ channel: task.channel, taskId, author: scn.persona, body: await persona.reply(fresh, 'fail', { reason: result.reason }) });
        taskChanged(taskId);
        return { intent, pass: false };
      }
      const xp = award(db.getTask(taskId), scn);
      db.updateTask(taskId, { xpAwarded: xp });
      post({ channel: task.channel, taskId, author: scn.persona, body: await persona.reply(fresh, 'pass') });
      await close(db.getTask(taskId), scn, 'passed');
      return { intent, pass: true, xp };
    } finally {
      busy.delete(taskId);
    }
  }

  async function hint(taskId) {
    const task = db.getTask(taskId);
    const scn = task && scenarios.get(task.scenarioId);
    if (!scn || task.state !== 'open' || task.hintsUsed >= 3) return null;
    db.updateTask(taskId, { hintsUsed: task.hintsUsed + 1 });
    const m = post({ channel: task.channel, taskId, author: 'system', kind: 'hint', body: render(scn.hints[task.hintsUsed], task.vars) });
    taskChanged(taskId);
    return m;
  }

  async function skip(taskId) {
    const task = db.getTask(taskId);
    const scn = task && scenarios.get(task.scenarioId);
    if (!scn || !['open', 'checking'].includes(task.state)) return false;
    const primary = scn.skills[0];
    db.setMastery(primary, Math.max(0, (effectiveMastery()[primary] ?? 0) - P.SKIP_PENALTY), now());
    await close(task, scn, 'abandoned');
    return true;
  }

  // lab reset wipes planted faults: cancel open tasks without penalty
  function cancelOpen(reason) {
    for (const task of db.openTasks()) {
      db.updateTask(task.id, { state: 'error', closedAt: now() });
      post({ channel: task.channel, taskId: task.id, author: 'system', body: `Task cancelled: ${reason}.` });
      taskChanged(task.id);
    }
  }

  function scheduleNext() {
    const iv = db.getSetting('interval', DEFAULT_INTERVAL);
    nextSpawnAt = now() + (iv.min + rng() * (iv.max - iv.min)) * 60000;
  }

  async function tick() {
    for (const task of db.openTasks()) {
      const scn = scenarios.get(task.scenarioId);
      if (!scn || task.state !== 'open' || task.nudges >= MAX_NUDGES || busy.has(task.id)) continue;
      if (now() - task.lastActivity < scn.followup_minutes * 60000) continue;
      db.updateTask(task.id, { nudges: task.nudges + 1, lastActivity: now() });
      post({ channel: task.channel, taskId: task.id, author: scn.persona, body: await persona.reply(personaCtx(task, scn, ''), 'nudge') });
    }
    if (nextSpawnAt === null) scheduleNext();
    if (clientCount > 0 && now() >= nextSpawnAt) {
      scheduleNext();
      await spawn();
    }
  }

  return {
    spawn, reply, hint, skip, tick, summary, cancelOpen,
    setClientCount: (n) => { clientCount = n; },
    nextSpawnAt: () => nextSpawnAt,
    rescheduleSpawn: scheduleNext,
    get _runner() { return runner; },
  };
}
