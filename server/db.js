import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY, scenario_id TEXT NOT NULL, vars_json TEXT NOT NULL, state TEXT NOT NULL,
  channel TEXT NOT NULL, persona TEXT NOT NULL, created_at INTEGER NOT NULL, closed_at INTEGER,
  last_activity INTEGER NOT NULL, hints_used INTEGER NOT NULL DEFAULT 0, nudges INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY, task_id INTEGER, channel TEXT NOT NULL, author TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'msg', body TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS messages_channel ON messages(channel, id);
CREATE TABLE IF NOT EXISTS attempts (task_id INTEGER NOT NULL, pass INTEGER NOT NULL, reason TEXT, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS mastery (skill_id TEXT PRIMARY KEY, score INTEGER NOT NULL, last_practiced INTEGER);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pass_days (day TEXT PRIMARY KEY);
`;

const OPEN_STATES = ['pending_setup', 'open', 'checking'];
const COLS = { state: 'state', closedAt: 'closed_at', lastActivity: 'last_activity', hintsUsed: 'hints_used', nudges: 'nudges', xpAwarded: 'xp_awarded', vars: 'vars_json' };

const rowToTask = (r) => r && ({
  id: r.id, scenarioId: r.scenario_id, vars: JSON.parse(r.vars_json), state: r.state, channel: r.channel,
  persona: r.persona, createdAt: r.created_at, closedAt: r.closed_at, lastActivity: r.last_activity,
  hintsUsed: r.hints_used, nudges: r.nudges, xpAwarded: r.xp_awarded,
});
const rowToMsg = (r) => ({ id: r.id, taskId: r.task_id, channel: r.channel, author: r.author, kind: r.kind, body: r.body, at: r.created_at });

const dayBefore = (d) => new Date(Date.parse(d + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);

  return {
    createTask({ scenarioId, vars, channel, persona, now = Date.now() }) {
      return Number(db.prepare(`INSERT INTO tasks (scenario_id, vars_json, state, channel, persona, created_at, last_activity)
        VALUES (?, ?, 'pending_setup', ?, ?, ?, ?)`).run(scenarioId, JSON.stringify(vars), channel, persona, now, now).lastInsertRowid);
    },
    updateTask(id, fields) {
      const sets = [], vals = [];
      for (const [k, v] of Object.entries(fields)) {
        if (!COLS[k]) throw new Error(`unknown task field ${k}`);
        sets.push(`${COLS[k]} = ?`);
        vals.push(k === 'vars' ? JSON.stringify(v) : v);
      }
      db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    },
    getTask: (id) => rowToTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)),
    openTasks: () => db.prepare(`SELECT * FROM tasks WHERE state IN (${OPEN_STATES.map(() => '?').join(',')}) ORDER BY id`).all(...OPEN_STATES).map(rowToTask),
    recentTasks: (n) => db.prepare('SELECT * FROM tasks ORDER BY id DESC LIMIT ?').all(n).map(rowToTask),
    recentScenarioIds: (n) => db.prepare('SELECT scenario_id FROM tasks ORDER BY id DESC LIMIT ?').all(n).map((r) => r.scenario_id),
    totalXp: () => db.prepare('SELECT COALESCE(SUM(xp_awarded),0) AS x FROM tasks').get().x,

    addMessage({ channel, taskId = null, author, body, kind = 'msg', now = Date.now() }) {
      const id = Number(db.prepare('INSERT INTO messages (task_id, channel, author, kind, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(taskId, channel, author, kind, body, now).lastInsertRowid);
      return rowToMsg(db.prepare('SELECT * FROM messages WHERE id = ?').get(id));
    },
    messages({ channel, taskId, limit = 500 }) {
      const rows = taskId != null
        ? db.prepare('SELECT * FROM messages WHERE task_id = ? ORDER BY id DESC LIMIT ?').all(taskId, limit)
        : db.prepare('SELECT * FROM messages WHERE channel = ? ORDER BY id DESC LIMIT ?').all(channel, limit);
      return rows.reverse().map(rowToMsg);
    },
    lastMessageIds: () => Object.fromEntries(db.prepare('SELECT channel, MAX(id) AS id FROM messages GROUP BY channel').all().map((r) => [r.channel, r.id])),

    addAttempt: (taskId, pass, reason, at = Date.now()) => db.prepare('INSERT INTO attempts VALUES (?, ?, ?, ?)').run(taskId, pass ? 1 : 0, reason, at),
    attempts: (taskId) => db.prepare('SELECT * FROM attempts WHERE task_id = ?').all(taskId).map((r) => ({ pass: !!r.pass, reason: r.reason, at: r.at })),

    getMastery: () => Object.fromEntries(db.prepare('SELECT * FROM mastery').all().map((r) => [r.skill_id, { score: r.score, lastPracticed: r.last_practiced }])),
    setMastery: (skill, score, lastPracticed) => db.prepare(`INSERT INTO mastery VALUES (?, ?, ?)
      ON CONFLICT(skill_id) DO UPDATE SET score = excluded.score, last_practiced = excluded.last_practiced`).run(skill, score, lastPracticed),

    getSetting(key, dflt = undefined) {
      const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return r ? JSON.parse(r.value) : dflt;
    },
    setSetting: (key, value) => db.prepare('INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value)),

    markPassDay: (day) => db.prepare('INSERT OR IGNORE INTO pass_days VALUES (?)').run(day),
    streak(today) {
      const has = (d) => !!db.prepare('SELECT 1 FROM pass_days WHERE day = ?').get(d);
      let d = has(today) ? today : dayBefore(today);
      let n = 0;
      while (has(d)) { n++; d = dayBefore(d); }
      return n;
    },
    close: () => db.close(),
  };
}
