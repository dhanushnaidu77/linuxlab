import http from 'node:http';
import { loadConfig } from './config.js';
import { loadDefs } from './defs.js';
import { loadScenarios } from './scenarios.js';
import { openDb } from './db.js';
import { createAuth } from './auth.js';
import { createRunner } from './runner.js';
import { createPersonaEngine } from './persona.js';
import { createTaskManager } from './tasks.js';
import { createApp } from './http.js';
import { loadChatter, loadSocial, createChatter } from './chatter.js';
import { createConversations } from './conversations.js';
import * as lab from './lab.js';

const log = (...a) => console.log(new Date().toISOString(), ...a);
const cfg = loadConfig();

if (!cfg.passwordHash || !cfg.sessionSecret) {
  console.error('No console password set. Run: scripts/set-password');
  process.exit(1);
}

const defs = loadDefs(cfg.defsDir);
const { scenarios, warnings } = loadScenarios(cfg.scenariosDir, defs);
for (const w of warnings) log('scenario skipped:', w);
log(`loaded ${scenarios.size} scenarios`);

const { convos, warnings: chatterWarnings } = loadChatter(cfg.defsDir, defs);
for (const w of chatterWarnings) log('chatter skipped:', w);

const db = openDb(cfg.dbPath);
const auth = createAuth({ passwordHash: cfg.passwordHash, secret: cfg.sessionSecret });
const persona = createPersonaEngine({ apiKey: cfg.anthropicKey, model: cfg.model, log });
log(persona.online ? `persona engine: ${cfg.model}` : 'persona engine: offline (no ANTHROPIC_API_KEY) — canned replies');

let broadcast = () => {};
const tm = createTaskManager({ db, defs, scenarios, runner: createRunner({ log }), persona, broadcast: (e) => broadcast(e), log });
const conv = createConversations({ db, defs, scenarios, tm, persona, broadcast: (e) => broadcast(e), log });
const web = createApp({ auth, db, defs, scenarios, tm, conv, persona, lab: { reset: lab.labReset, start: lab.labStart }, log });
broadcast = web.broadcast;
const chatter = createChatter({ db, convos, social: loadSocial(cfg.defsDir, defs), broadcast: (e) => broadcast(e), clientCount: () => web.clientCount() });

// tasks left mid-check by a previous crash go back to open
for (const t of db.openTasks()) if (t.state !== 'open') db.updateTask(t.id, { state: 'open' });

async function pollLab() {
  const s = await lab.labStatus();
  if (s.status !== web.state().lab.status) broadcast({ type: 'lab', ...s });
  web.setLabState(s);
}
await pollLab();
setInterval(() => pollLab().catch((e) => log('lab poll', e.message)), 15_000);
setInterval(() => tm.tick().catch((e) => log('tick', e.stack)), 15_000);
setInterval(() => chatter.tick().catch((e) => log('chatter', e.stack)), 15_000);

const server = http.createServer(web.app);
server.on('upgrade', web.handleUpgrade);
server.listen(cfg.port, '0.0.0.0', () => log(`LinuxLab console on http://0.0.0.0:${cfg.port} (LAN only)`));
