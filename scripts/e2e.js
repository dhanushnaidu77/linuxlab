#!/usr/bin/env node
// Browser smoke test: starts a throwaway console (temp DB, temp password) on a spare port and drives it with Playwright.
// usage: npm run test:e2e [-- --shots <dir>]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { chromium } from 'playwright';
import { ROOT } from '../server/config.js';

const shotsIdx = process.argv.indexOf('--shots');
const shots = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-e2e-'));
const PORT = 8099;
const env = { ...process.env, PORT: String(PORT), LAB_DB: path.join(tmp, 'e2e.db'), LAB_PASSWORD_HASH: bcrypt.hashSync('e2e-pw', 4), SESSION_SECRET: 'e2e', ANTHROPIC_API_KEY: process.env.E2E_API_KEY || '' };
const srv = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
srv.stdout.on('data', (d) => (log += d));
srv.stderr.on('data', (d) => (log += d));
const done = (code, msg) => { srv.kill(); if (msg) console.log(msg); if (code) console.log('--- server log ---\n' + log); process.exit(code); };
const step = (s) => console.log(`• ${s}`);
const shot = async (page, name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, `${name}.png`) }); } };

for (let i = 0; i < 50 && !log.includes('LinuxLab console on'); i++) await new Promise((r) => setTimeout(r, 100));
if (!log.includes('LinuxLab console on')) done(1, 'server did not start');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`);
  step('login');
  await page.fill('#login-pw', 'e2e-pw');
  await page.click('#login-form button');
  await page.waitForSelector('#app:not(.hidden)');
  await page.waitForSelector('#channel-list li');
  await shot(page, '1-empty');

  step('live mode toggle');
  await page.waitForFunction(() => document.querySelector('#live-status')?.textContent.includes('live off'));
  await page.click('#live-status');
  await page.waitForFunction(() => document.querySelector('#live-status')?.textContent === '● live');
  await page.click('#live-status');
  await page.waitForFunction(() => document.querySelector('#live-status')?.textContent.includes('live off'));

  step('new ticket');
  await page.click('#btn-new');
  await page.waitForSelector('#task-list li .t-title', { timeout: 30000 });
  await page.click('#task-list li');
  await page.waitForSelector('#thread:not(.hidden) .msg');
  const title = await page.textContent('#thread-title');
  step(`thread open: ${title}`);
  await shot(page, '2-thread');

  step('ask a question → persona replies');
  await page.fill('#composer-text', 'which server is this on?');
  await page.press('#composer-text', 'Enter');
  await page.waitForFunction(() => document.querySelectorAll('#thread-msgs .msg').length >= 3, null, { timeout: 30000 });

  step('hint');
  await page.click('#btn-hint');
  await page.waitForSelector('#thread-msgs .msg.hint');

  step('say done (not actually done) → check fails, task stays open');
  await page.fill('#composer-text', 'done, should be good now');
  await page.press('#composer-text', 'Enter');
  await page.waitForFunction(() => document.querySelectorAll('#thread-msgs .msg').length >= 6, null, { timeout: 60000 });
  await shot(page, '3-replies');

  step('DM a colleague → they reply');
  await page.click('#dm-list li:has-text("Kofi")');
  await page.waitForFunction(() => document.querySelector('#channel-title')?.textContent.includes('Kofi'));
  await page.fill('#channel-text', 'hey, got a minute?');
  await page.press('#channel-text', 'Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('#channel-msgs .msg .who')].some((e) => e.textContent.startsWith('Kofi')), null, { timeout: 30000 });

  step('click a person → profile card with title');
  await page.click('#channel-msgs .msg .who[data-person="kofi"]');
  await page.waitForSelector('#profile:not(.hidden)');
  if (!(await page.textContent('#profile')).includes('DevOps Engineer')) throw new Error('profile card missing title');
  await shot(page, '8-profile');
  await page.keyboard.press('Escape');

  step('forward the ticket to Kofi');
  await page.click('#task-list li');
  await page.waitForSelector('#thread-msgs .msg');
  await page.hover('#thread-msgs .msg');
  await page.click('#thread-msgs .msg [data-fwd]');
  await page.selectOption('#forward-to', 'dm:kofi');
  await page.fill('#forward-note', 'any idea where to start?');
  await page.click('#forward-send');
  await page.click('#dm-list li:has-text("Kofi")');
  await page.waitForSelector('#channel-msgs .fwd-card', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('#channel-msgs .msg .who').length >= 4, null, { timeout: 30000 });
  await shot(page, '7-dm-forward');

  step('terminal');
  await page.click('.tab[data-tab="term"]');
  await page.waitForSelector('.term-pane .xterm');
  await page.waitForTimeout(1500);
  await page.keyboard.type('echo "E2E=$(hostname)"\n');
  await page.waitForFunction(() => document.querySelector('.term-pane:not(.hidden) .xterm-rows')?.textContent.includes('E2E=jump01'), null, { timeout: 10000 });
  await shot(page, '4-terminal');

  step('split view');
  await page.keyboard.press('Control+\\');
  await page.waitForSelector('#main.split');
  await shot(page, '5-split');

  step('skip ticket → solution shown');
  await page.click('.tab[data-tab="chat"]');
  await page.click('#task-list li');
  page.once('dialog', (d) => d.accept());
  await page.click('#btn-skip');
  await page.waitForSelector('#thread-msgs .solution', { timeout: 30000 });
  await shot(page, '6-solution');

  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
  await browser.close();
  done(0, 'E2E passed');
} catch (e) {
  await browser.close();
  done(1, `E2E FAILED: ${e.message}`);
}
