# LinuxLab Console — Design Spec

**Date:** 2026-10-15
**Status:** Draft, awaiting review

## 1. Purpose

A LAN-only web console for daily Linux/networking practice that simulates being the go-to ops person at a fictional company ("Darkroom Labs"). Coworker personas tag the user in Slack-style chat with realistic requests; the user does the work in a real terminal against a containerized lab network, replies "done", and an automated check verifies the work.

**Success criteria**
- User can open `http://10.0.0.97:8088` from any LAN device, log in, and receive tasks.
- Every task is verifiably completable (scenario self-test passes) and graded deterministically by scripts, not by the LLM.
- Practice covers a blend of DevOps/SRE, network engineering, and sysadmin skills on Ubuntu 24.04.
- Lab mistakes never affect the host.

**Non-goals (v1)**
- Multi-user support, mobile-optimized UI, internet-facing deployment, LLM-generated scenarios or check scripts, screenshot-based proof.

## 2. Architecture overview

```
Browser (LAN) ──HTTP/WS──► Node server (host, :8088)
                              ├─ Express: UI, REST API, auth, IP allowlist
                              ├─ WS /term: node-pty ↔ `docker exec -it jump01 su - dhan`
                              ├─ WS /events: chat push (new msgs, follow-ups, results)
                              ├─ Scheduler: picks scenarios, timers, follow-ups
                              ├─ Runner: executes setup/check/cleanup via docker exec
                              ├─ Persona engine: Anthropic SDK (Haiku) + fallback
                              └─ SQLite (data/lab.db)
                           ──docker CLI──► Lab (docker compose)
```

Single Node.js process (Express + `ws` + `node-pty` + `better-sqlite3` + `@anthropic-ai/sdk`). Frontend: plain HTML/CSS/JS modules with xterm.js (no framework build step; vendored or served from node_modules).

## 3. Lab environment

All hosts: Ubuntu 24.04, systemd as PID 1, user `dhan` with passwordless sudo, SSH between hosts via pre-shared key from jump01.

| Host  | Networks (IP)                                   | Role |
|-------|-------------------------------------------------|------|
| jump01 | office-net 10.10.1.10                          | Entry point for the user's terminal |
| rtr01 | office 10.10.1.1, dmz 10.10.2.1, backend 10.10.3.1 | IP forwarding + nftables firewall |
| web01 | dmz-net 10.10.2.10                              | nginx |
| app01 | backend-net 10.10.3.10                          | App service (systemd unit), cron jobs |
| db01  | backend-net 10.10.3.20                          | PostgreSQL |
| ns01  | backend-net 10.10.3.53                          | bind9, authoritative for `darkroom.internal` |

- Hosts use rtr01 as default gateway and ns01 as resolver; Docker's embedded DNS is not relied on for lab names.
- Compose networks are `internal: true` (no internet). Optional `aptcache` service (apt-cacher-ng) on a separate network reachable only by rtr01-forwarded traffic, enabled for package scenarios.
- Containers: not privileged. `cgroupns: private`, tmpfs `/run`, `/run/lock`, `/tmp`; `cap_add: [NET_ADMIN, NET_RAW]` (plus `SYS_ADMIN` only if systemd strictly requires it — to be verified during implementation and documented).
- One shared base image (`lab/base`) with common tooling (iproute2, nftables, tcpdump, dnsutils, curl, net-tools, procps, htop, lsof, strace, vim, nano, jq, openssh, rsync, cron, sudo); role images extend it.
- **Reset:** `docker compose down -v && up -d` for full reset; per-host reset recreates a single container. Exposed in the UI settings menu.

## 4. Scenarios

Location: `scenarios/<skill>/<id>/`.

### 4.1 `scenario.yaml`

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique slug |
| `title` | yes | Human title (shown in task list) |
| `skills` | yes | List of skill ids from `skills.yaml`; first is primary |
| `difficulty` | yes | 1–5 |
| `channel` | yes | Channel name or `dm` |
| `persona` | yes | Persona id |
| `targets` | yes | Hosts touched by setup/check |
| `vars` | no | Map of name → `{pick: [...]}`, `{range: [min,max]}`, `{random: "word"|"port"|"user"}`, or `{from_setup: true}` |
| `message` | yes | Opening message; `{{VAR}}` interpolation |
| `secret_context` | yes | Hidden truth for the persona LLM; `{{VAR}}` interpolation |
| `answer` | no | `{type: exact|regex|number|set, extract: "<what to pull from user's reply>", value?: "<template or from_setup var>"}` |
| `followup_minutes` | no | Default 20; alerts default 8 |
| `alert` | no | `true` → posts in `#oncall-alerts`, jumps queue |
| `hints` | yes | Exactly 3 strings: nudge, direction, command |

### 4.2 Scripts

All scripts run **on the host** (in the Node runner) with bash, the scenario vars in env, and helpers sourced from `lib/check-helpers.sh`: `on <host> '<cmd>'` or `on <host> <<'EOF' ... EOF` runs a command/script on a lab host via `docker exec` (scenario vars are forwarded), `as_user <host> <user> '<cmd>'` runs as a lab user.
- `setup.sh` — plants the scenario state. May print `KEY=value` lines to stdout to define `from_setup` vars.
- `check.sh` — exit 0 = pass; nonzero = fail, first stdout line = reason.
- `cleanup.sh` — optional.
- `solve.sh` — test-only reference solution (runs on host with `on` helper).
- `solution.md` — shown after pass; may use `{{VAR}}`.

All script execution has a 30s timeout; timeout = fail with reason `check timed out`.

### 4.3 Answer-type checks

When `answer` is set, the LLM extracts the candidate value from the user's reply (structured output: `{value: string|null}`). The runner then compares deterministically against the expected value (from vars/setup). Extracted values are passed as data (env var / argument), never interpolated into shell code. If both `answer` and `check.sh` exist, both must pass.

### 4.4 Tooling

- `scripts/new-scenario <skill> <id>` — scaffolds folder with templates.
- Startup linter validates every scenario (schema, referenced vars defined, persona/skill/channel exist, scripts present & executable). Invalid scenarios are skipped with a logged warning.

### 4.5 Initial content

~40 scenarios covering every skill node at least twice, difficulty 1–4, all passing the self-test.

## 5. Personas, channels, skills

- `data-defs/personas.yaml` — ~8 personas: id, name, role, team, home channel, style notes, technical level (1–5), patience (affects follow-up tone). Initial cast: Marcus (senior SRE), Priya (PM), Tom (vague backend dev), Leah (netops), Raj (IT helpdesk), Ana (data engineer), Sam (security), Diane (CTO, rare).
- `data-defs/channels.yaml` — `#platform`, `#netops`, `#it-helpdesk`, `#backend`, `#data`, `#oncall-alerts`, plus DMs.
- `data-defs/skills.yaml` — skill nodes with `tier` and `requires`:
  - Tier 1 Core: files, permissions, text-processing, processes, users
  - Tier 2 Systems: systemd, logs, disks, cron, packages, ssh
  - Tier 3 Network & Troubleshooting: ip-routing, dns, ports-sockets, firewall, tls, packet-capture, incidents

## 6. Task lifecycle

States: `pending_setup → open → checking → (open | passed) → closed`; also `abandoned` (user skips).

1. **Spawn.** Scheduler fires on a random 5–20 min interval (configurable) while ≥1 client is connected and not paused, or on "New ticket" button. Max 3 open tasks (alerts may exceed by 1). Selection: 70% weighted toward lowest-mastery unlocked skills, 30% uniform among unlocked; exclude scenarios used in the last 10 tasks; difficulty within ±1 of the skill's current level.
2. **Setup.** Resolve vars, run `setup.sh` on targets. On failure: mark task errored, log, do not post message, pick another.
3. **Post.** Opening message rendered and posted to channel as the persona, creating a thread. Unread badge + mention.
4. **Converse.** Each user reply in a thread → persona engine (§7) → intent ∈ {`question`, `done`, `answer`, `other`}.
   - `question`/`other`: persona reply only.
   - `done`/`answer`: run check (§4.3). Persona reply is generated from the check result (pass, or fail reason without revealing the fix).
5. **Follow-up.** If no user message in thread for `followup_minutes`, persona posts a nudge (max 2 nudges).
6. **Hints.** Hint button reveals hints 1→3 sequentially; each reduces task XP by 25%.
7. **Pass.** Persona thanks user; award XP and mastery; show solution panel; run cleanup; task closes.
8. **Skip.** User can abandon a task (no XP, small mastery penalty, solution shown).

## 7. Persona engine

- Model: `claude-haiku-5-5` via `@anthropic-ai/sdk`, key from `ANTHROPIC_API_KEY` in `.env`.
- Single call per user message with tool/structured output returning `{intent, extracted_answer?, reply}`. If intent is `done`/`answer`, a second call generates the reply after the check result is known (the first call's `reply` is discarded).
- System prompt = persona definition + scenario `secret_context` + rules: stay in character, only reveal info from secret_context, never reveal fix or exact commands, keep messages short and chat-like.
- Context = thread history (last 20 messages).
- **Fallback (no key / API error / timeout 10s):** intent via keyword regex (`done|fixed|finished|should be (good|ok)|all set|resolved|killed|restarted` → done; message containing `?` → question); answer extraction via the raw message text; replies from canned per-persona templates (`thanks!`, `still seeing it: <reason>`, `not sure, can you take a look?`).

## 8. Progress & persistence

SQLite `data/lab.db` tables: `tasks` (id, scenario_id, vars_json, state, created_at, closed_at, hints_used, xp_awarded), `messages` (id, task_id nullable, channel, author, body, created_at), `attempts` (task_id, result, reason, at), `mastery` (skill_id, score, last_practiced), `settings` (key, value), `streak` (date).

- Mastery: +`10 × difficulty × (1 − 0.25 × hints)` on pass, capped at 100; −2 on skip; decays 1 point/day after 7 days without practice.
- Unlock: a skill unlocks when all `requires` skills reach mastery ≥ 30.
- XP and level are derived from total awarded XP; streak = consecutive days with ≥1 passed task.

## 9. UI

- Header: company name, XP, level, streak, settings (⚙).
- Left sidebar: **Chat / Terminal** tabs.
  - Chat tab: channels (unread counts), DMs, open tasks with elapsed timers, collapsible skill tree with mastery bars.
  - Terminal tab: list of terminal sessions (open/close/rename).
- Main pane: active view. `Ctrl+\` toggles split view (chat left, terminal right).
- Thread view: messages, reply box, 💡 Hint, Skip; solution panel after close.
- Settings: reset lab, reset host, spawn interval, pause, Tailscale access toggle.
- Dark theme, Slack-like density. Desktop browsers only for v1.

## 10. Security

- Listen `0.0.0.0:8088`; every HTTP and WS request checked against allowlist: `127.0.0.0/8`, `::1`, `10.0.0.0/24`, Docker bridge ranges. Tailscale `100.64.0.0/10` only when enabled in settings. Others → 403/close.
- Auth: single password, bcrypt hash in `.env` (`LAB_PASSWORD_HASH`), generated by `scripts/set-password`. Signed `httpOnly`, `SameSite=Strict` session cookie, 7-day expiry. 5 failures → 10-minute lockout. WS upgrade requires valid session and same-origin `Origin` header.
- Terminal command is hardcoded (`docker exec -it jump01 su - dhan`); no client input influences the spawned command except resize events.
- Scripts are only loaded from `scenarios/`; LLM output is never executed; extracted answers passed as data.
- No container mounts the Docker socket; containers non-privileged with minimal caps.

## 11. Error handling

- Docker/lab down at startup → UI banner "Lab offline — Start lab" button runs `docker compose up -d`.
- Setup failure → task discarded silently, logged, next scenario tried (max 3 retries).
- Check script error/timeout → treated as fail with reason, plus a log entry; persona says it's still broken.
- API failure → fallback mode (§7), UI shows small "offline personas" indicator.
- Terminal disconnect → auto-reconnect with backoff; session is fresh (no tmux persistence in v1).

## 12. Testing

- **Unit (node:test):** var resolution, scheduler weighting/exclusion, answer comparators, IP allowlist, auth + lockout, fallback intent detection, scenario linter.
- **Scenario self-test (`npm run test:scenarios [id]`):** for each scenario: reset targets → setup → assert check FAILS → solve.sh → assert check PASSES → cleanup.
- **E2E smoke (Playwright):** login, open terminal, run `hostname` → `jump01`, post chat message, receive reply (fallback mode).

## 13. Repo layout

```
linuxlab/
  server/            # Node backend (index.js, auth, allowlist, term, scheduler, runner, persona, db)
  web/               # static frontend (index.html, css, js modules)
  lab/               # docker-compose.yml, Dockerfiles, host configs
  scenarios/<skill>/<id>/
  data-defs/         # personas.yaml, channels.yaml, skills.yaml
  lib/check-helpers.sh
  scripts/           # new-scenario, set-password, lab-reset
  test/
  data/              # lab.db (gitignored)
  .env.example
  docs/superpowers/specs/
```

## 14. Open items to verify during implementation

- ~~Minimal capability set for systemd-in-Docker~~ **Resolved (spike 2026-10-15):** on kernel 7.0 / cgroup v2 systemd boots non-privileged with `cgroupns: private`, `cap_add: [SYS_ADMIN, NET_ADMIN, NET_RAW, SYS_PTRACE]` (SYS_PTRACE so `ss -p`/`lsof`/`strace` see other users' processes), `security_opt: [apparmor=unconfined]`, tmpfs `/run` `/run/lock` `/tmp`, env `container=docker`, and an entrypoint that runs `mount -o remount,rw /sys/fs/cgroup` before `exec /sbin/init` (the private cgroupns limits writes to the container's own subtree). Without apparmor=unconfined the remount is denied.
- Whether apt-cacher-ng is worth including in v1 or deferred until package scenarios are written.
