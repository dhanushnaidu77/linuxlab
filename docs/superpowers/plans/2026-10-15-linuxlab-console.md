# LinuxLab Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LAN-only web console with Slack-style chat tasks from coworker personas and a browser terminal into a containerized Ubuntu lab network, with script-verified task completion.

**Architecture:** One Node 18 process (Express + ws + node-pty + better-sqlite3 + Anthropic SDK) serves a framework-free frontend, drives the lab via the `docker` CLI, and persists to SQLite. The lab is a docker-compose network of six systemd-enabled Ubuntu 24.04 containers across three internal subnets routed by `rtr01`.

**Tech Stack:** Node 18.19, express 4, ws 8, node-pty 1, better-sqlite3 11, bcryptjs, yaml, @anthropic-ai/sdk, @xterm/xterm 5 + addon-fit, node:test, Docker Compose v2, bash.

**Spec:** `docs/superpowers/specs/2026-10-15-linuxlab-console-design.md`

## Global Constraints

- Node 18.19 runtime (no `node:sqlite`, use better-sqlite3 v11). Tests via `node --test`.
- Server listens `0.0.0.0:8088`; allowlist `127.0.0.0/8`, `::1`, `10.0.0.0/24`, `172.16.0.0/12` (Docker); `100.64.0.0/10` only when tailscale setting enabled.
- Lab hosts: Ubuntu 24.04, systemd PID 1, user `dhan` passwordless sudo. Container names == hostnames (`jump01 rtr01 web01 app01 db01 ns01`).
- Subnets: office 10.10.1.0/24, dmz 10.10.2.0/24, backend 10.10.3.0/24; Docker bridge gateway `.254`, rtr01 at `.1` on each.
- Container runtime flags per spec §14 (SYS_ADMIN, NET_ADMIN, NET_RAW, apparmor=unconfined, cgroupns private, tmpfs, remount entrypoint). Never `privileged`, never mount docker.sock.
- Persona model `claude-haiku-5-5`; 10 s timeout; fallback when key missing.
- Terminal command hardcoded: `docker exec -it jump01 su - dhan`.
- LLM output never executed; extracted answers passed as env data.

## Review Focus

1. Request from a non-allowlisted IP (incl. `::ffff:`-mapped IPv4 and Tailscale 100.x) → rejected for both HTTP and WS upgrade. Test in Task 2.
2. User replies "done" while the fault still exists → check fails, persona says still broken, task stays open (no XP). Test in Task 6.
3. Lab containers stopped / docker unavailable when a task spawns or a check runs → no crash; task errors cleanly, UI shows lab offline. Test in Task 6 (runner error path).
4. Scenario with malformed YAML or missing script → skipped with warning, server still starts. Test in Task 3.
5. Anthropic API key missing or call throws → fallback intent + canned reply; "done" still triggers checks. Test in Task 5.

---

### Task 1: Project scaffold + config
**Files:** `package.json`, `.env.example`, `server/config.js`, `scripts/set-password`, `test/config.test.js`
**Produces:** `loadConfig(env = process.env) → {port, passwordHash, sessionSecret, anthropicKey, model, dbPath, root}`; `.env` parsed by a minimal loader (`loadDotEnv(path)`).
- [ ] Test: `.env` lines parsed (comments, quotes); defaults applied (port 8088, model `claude-haiku-5-5`).
- [ ] Implement, run `node --test`, commit.

### Task 2: IP allowlist + auth
**Files:** `server/allowlist.js`, `server/auth.js`, tests.
**Produces:** `isAllowed(ip, {tailscale:boolean}) → boolean`; `createAuth({passwordHash, secret, now?}) → {attemptLogin(ip, password) → {ok, cookie?, locked?}, verifyCookie(cookieHeader) → boolean, cookieName}`.
- [ ] Tests: allowed 127.0.0.1, ::1, ::ffff:10.0.0.5, 10.0.0.250, 172.18.0.1; denied 10.0.1.5, 8.8.8.8, 100.107.93.47 (allowed when tailscale true); garbage → false.
- [ ] Tests: correct password → signed cookie verifies; tampered cookie fails; expired (7d) fails; 5 wrong → locked for 10 min even with correct password; unlock after 10 min.
- [ ] Implement (HMAC-SHA256 cookie `v1.<expiry>.<sig>`, bcryptjs compare), commit.

### Task 3: Definitions + scenario loader/linter + var resolution
**Files:** `data-defs/{personas,channels,skills}.yaml`, `server/defs.js`, `server/scenarios.js`, `scripts/new-scenario`, tests with fixture scenarios in `test/fixtures/scenarios/`.
**Produces:** `loadDefs(dir) → {personas: Map, channels: Map, skills: Map}`; `loadScenarios(dir, defs) → {scenarios: Map<id, Scenario>, warnings: string[]}` where Scenario = parsed yaml + `dir`; `resolveVars(scenario, rng) → Record<string,string>`; `render(tpl, vars) → string`; `mergeSetupOutput(vars, stdout) → vars`.
- [ ] Tests: valid fixture loads; malformed yaml / missing check.sh / unknown persona / unknown skill / ≠3 hints → skipped with warning; `{{VAR}}` render leaves unknown vars visible; pick/range/random resolution deterministic with seeded rng; `KEY=value` setup output merged only for `from_setup` vars.
- [ ] Implement, commit.

### Task 4: DB + progress math + scheduler
**Files:** `server/db.js`, `server/progress.js`, `server/scheduler.js`, tests.
**Produces:** `openDb(path)` with methods `createTask, updateTask, getTask, openTasks, recentScenarioIds(n), addMessage, messages(channel|taskId), addAttempt, getMastery(), setMastery(skill, score), getSetting/ setSetting, markPassDay(date), streak(today)`; `progress.gain(difficulty, hints)`, `progress.decay(score, lastPracticed, now)`, `progress.unlocked(skills, mastery) → Set`, `progress.level(totalXp)`; `pickScenario({scenarios, mastery, unlocked, recentIds, rng}) → Scenario|null`.
- [ ] Tests: gain(2,0)=20, gain(2,1)=15, cap 100; decay none ≤7 days then 1/day; tier-1 unlocked by default, tier-2 requires ≥30; picker excludes recent and locked; picker returns null when none eligible; weighted toward weakest (statistical over seeded rng).
- [ ] Implement, commit.

### Task 5: Persona engine with fallback
**Files:** `server/persona.js`, `server/intent.js`, `test/persona.test.js`.
**Produces:** `fallbackIntent(text) → 'done'|'question'|'other'` (answer scenarios map done/other→'answer'); `createPersonaEngine({apiKey, model, client?}) → {classify(ctx) → Promise<{intent, extracted}>, reply(ctx, kind, extra) → Promise<string>, online:boolean}`; kinds: `chat`, `pass`, `fail`, `nudge`.
- [ ] Tests: fallback regex cases; with no key, classify uses fallback and reply returns canned text containing fail reason; with fake client that throws, same fallback; with fake client returning tool_use, intent/extracted parsed.
- [ ] Implement, commit.

### Task 6: Runner + task manager
**Files:** `server/runner.js`, `lib/check-helpers.sh`, `server/answers.js`, `server/tasks.js`, tests (runner tested with a fake `exec` function).
**Produces:** `createRunner({docker='docker', timeoutMs=30000}) → {runSetup(scn, vars) → vars, runCheck(scn, vars, extra) → {pass, reason}, runScript(scn, name, vars)}`; `compareAnswer(spec, expected, actual) → boolean`; `createTaskManager({db, scenarios, defs, runner, persona, broadcast, rng, now}) → {spawn(opts), reply(taskId, text), hint(taskId), skip(taskId), tick()}`.
- [ ] Tests: compareAnswer exact (trim/case-insensitive), regex, number (tolerance), set (order-insensitive comma/space list).
- [ ] Tests (fake runner/persona): spawn posts message to channel; "done" + failing check → attempt recorded, task open, reply posted; "done" + passing → task passed, mastery up, solution broadcast; runner throws → task errored, no crash; hints decrement XP; tick posts nudge after followup minutes, max 2.
- [ ] Implement, commit.

### Task 7: HTTP/WS server + terminal
**Files:** `server/index.js`, `server/term.js`, `server/http.js`.
**Produces:** REST: `POST /api/login`, `GET /api/state`, `GET /api/messages?channel=`, `POST /api/tasks/:id/reply|hint|skip`, `POST /api/tasks/spawn`, `POST /api/settings`, `POST /api/lab/reset[?host=]`, `POST /api/lab/start`. WS: `/ws/events` (server→client JSON events), `/ws/term` (binary/text pty data; JSON `{type:'resize',cols,rows}`).
- [ ] Allowlist on every request + upgrade; auth middleware; Origin check on upgrades.
- [ ] Smoke test `test/server.smoke.test.js`: start on random port with fakes → 403 for disallowed IP via header-free check of handler, 401 without cookie, login works, `/api/state` returns channels.
- [ ] Commit.

### Task 8: Frontend
**Files:** `web/index.html`, `web/app.css`, `web/js/{main,api,chat,term,skills}.js`.
- [ ] Login screen; header with XP/level/streak; sidebar Chat/Terminal tabs; channel list with unread; thread view with reply/hint/skip; solution panel; terminal sessions (multiple) with xterm + fit; Ctrl+\ split view; settings modal (pause, interval, tailscale, reset lab/host).
- [ ] Manual verify in browser; commit.

### Task 9: Lab images + compose
**Files:** `lab/docker-compose.yml`, `lab/base/{Dockerfile,lab-entrypoint,lab-net.service,lab-net.sh}`, `lab/{web01,app01,db01,ns01,rtr01,jump01}/...`, `scripts/lab`.
- [ ] Base image: systemd, sshd, tooling, user dhan + shared key; `lab-net.service` sets default route via `$LAB_GW` and resolv.conf → ns01.
- [ ] Roles: rtr01 (ip_forward, nftables allow-all baseline), web01 (nginx site `darkroom.internal`), app01 (`darkroom-api` python service :8080 + cron), db01 (postgresql 16 listening on backend), ns01 (bind9 zone `darkroom.internal`).
- [ ] Verify: all hosts `systemctl is-system-running` ∈ {running, degraded-without-failures}; from jump01: `ssh web01 hostname`, `dig +short db01.darkroom.internal`, `curl -s web01`, `ping -c1 10.10.3.20`. Commit.

### Task 10: Scenario bank + self-test
**Files:** `scenarios/**`, `scripts/test-scenarios.js` (`npm run test:scenarios [id]`).
- [ ] Self-test harness: reset targets (container restart), setup → check must FAIL → solve → check must PASS → cleanup.
- [ ] ~40 scenarios spread across all 18 skills, each passing self-test. Commit per batch.

### Task 11: Run docs
**Files:** `README.md`.
- [ ] Setup (npm install, set-password, lab build, start), usage, adding scenarios. Commit.
