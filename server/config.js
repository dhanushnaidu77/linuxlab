import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseDotEnv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

export function loadDotEnv(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return {};
  return parseDotEnv(fs.readFileSync(file, 'utf8'));
}

export function loadConfig(env = { ...loadDotEnv(), ...process.env }) {
  return {
    root: ROOT,
    port: Number(env.PORT || 8088),
    passwordHash: env.LAB_PASSWORD_HASH || '',
    sessionSecret: env.SESSION_SECRET || '',
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    model: env.LAB_MODEL || 'claude-haiku-5-5',
    dbPath: env.LAB_DB || path.join(ROOT, 'data', 'lab.db'),
    scenariosDir: path.join(ROOT, 'scenarios'),
    defsDir: path.join(ROOT, 'data-defs'),
  };
}
