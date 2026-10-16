# LinuxLab Console

A LAN-only web console for everyday Linux and networking practice. Coworkers at the fictional **Kestrel Labs** tag you in a
Slack-style chat with realistic requests ("app01 is crawling", "add a DNS record", "who's sniffing plaintext creds?").
You do the work in a real terminal on a containerized lab network, reply "done" (or paste the answer), and a script checks it.

```
 office-net 10.10.1.0/24        dmz-net 10.10.2.0/24        backend-net 10.10.3.0/24
 jump01 (you start here) ── rtr01 (router + nftables) ── web01 (nginx)
                                                    └──── app01 (kestrel-api, cron) · db01 (postgres) · ns01 (bind9)
```
All hosts are Ubuntu 24.04 with real systemd. You can SSH from jump01 to any of them (`ssh web01`) and use sudo everywhere.
The lab has no internet access and can't reach your LAN.

## Setup

Requirements: Docker with Compose v2, Node.js 18.19 or newer, and build tools for the native modules (`build-essential`, `python3`).

```bash
npm install
scripts/set-password                 # console password → .env (bcrypt hash + session secret)
scripts/lab build                    # build the 6 lab images (a few minutes the first time)
scripts/lab up                       # start the lab
npm start                            # http://<this-machine>:8088
```

Optional: add `ANTHROPIC_API_KEY=...` to `.env` so coworkers reply naturally (Claude Haiku, fractions of a cent per message).
Without a key, the console uses canned replies and keyword detection, and everything else works the same.

If the host runs a firewall, allow the port from your LAN only, e.g. `sudo ufw allow from 10.0.0.0/24 to any port 8088 proto tcp`.

### Run it as a service (optional)
```ini
# ~/.config/systemd/user/linuxlab.service
[Unit]
Description=LinuxLab console
After=docker.service

[Service]
WorkingDirectory=%h/Downloads/linuxlab
ExecStart=/usr/bin/node server/index.js
Restart=on-failure

[Install]
WantedBy=default.target
```
`systemctl --user enable --now linuxlab` and `loginctl enable-linger $USER` (so it keeps running after you log out).

## Using it

- **Chat tab**: channels, DMs and open tickets. Click a request to open its thread, then reply there.
  - Ask questions and the coworker answers in character, revealing only what they'd plausibly know.
  - Say you're done ("fixed", "should be good now") and the check runs. You get a pass, or a "still broken" message describing the symptom.
  - For questions that have an answer (a PID, a path, an IP), just reply with it.
  - 💡 **Hint** gives three escalating hints, each costing 25% of the ticket's XP. **Skip** shows the solution.
- **Terminal tab**: as many sessions as you like, each starting on `jump01`. Double-click a session to rename it.
- **Ctrl+\\**: split view, with chat and terminal side by side.
- **⚙ Settings**: pause, ticket frequency (a new ticket every 5–20 min by default, only while the page is open), Tailscale access, and resetting the lab or a single host.
- **Progress**: 18 skills in 3 tiers. Passing tickets raises mastery. Higher tiers unlock when their prerequisites reach 30. Mastery slowly drops after a week without practice. The scheduler favours your weakest unlocked skills.

## Security model

- Only accepts connections from `127.0.0.0/8`, `10.0.0.0/24`, Docker bridges and (if enabled) Tailscale `100.64.0.0/10`. This applies to both HTTP and websockets.
- One password (bcrypt). Sessions use an HttpOnly, SameSite=Strict cookie that lasts 7 days. 5 wrong attempts lock login for 10 minutes. Websockets also check Origin.
- The browser terminal can only run `docker exec -it jump01 su - dhan`. Nothing the browser sends reaches the command line.
- Lab containers are **not** privileged. They get `SYS_ADMIN` (needed for systemd), `NET_ADMIN`/`NET_RAW` (ip, nft, tcpdump) and `SYS_PTRACE` (`ss -p`, lsof). AppArmor is unconfined for the cgroup remount. No container mounts the Docker socket.
- Scenario scripts come only from `scenarios/`. AI output is never executed, and answers extracted from chat are passed to checks as data.

## Scenarios

`scenarios/<skill>/<id>/`:

| file | purpose |
|---|---|
| `scenario.yaml` | title, skills, difficulty, channel, persona, vars, opening message, hidden context for the persona, optional `answer`, 3 hints |
| `setup.sh` | plants the fault; may print `KEY=value` to define `from_setup` vars |
| `check.sh` | exit 0 = pass; on failure print one line describing what the coworker would see |
| `solve.sh` | reference solution, used only by the self-test (print `ANSWER=...` for answer scenarios) |
| `cleanup.sh` | optional; restores the baseline |
| `solution.md` | shown after a pass or skip (`{{VAR}}` placeholders are filled in) |

Scripts run on the console host. `on <host> '<cmd>'` / `on <host> <<'X' ... X` run a command or script on a lab host (scenario
vars are forwarded), `as_user <host> <user> '<cmd>'` runs as a lab user, and `fail '<reason>'` fails a check.

```bash
scripts/new-scenario dns cname-record     # scaffold
npm run test:scenarios -- cname-record    # reset targets → setup → check must FAIL → solve → check must PASS → cleanup
npm run test:scenarios                    # all of them (recreates lab containers!)
npm run test:scenarios -- --fast dns      # skip container resets
```
Restart the console after adding scenarios. Invalid scenarios are skipped, with a warning in the log.

## Development

```bash
npm test               # unit + integration tests (integration parts skip if the lab is down)
npm run test:e2e       # Playwright: throwaway server on :8099, drives the UI end to end
scripts/lab status     # systemd state of every lab host
scripts/lab reset app01
```

Design spec: `docs/superpowers/specs/2026-10-15-linuxlab-console-design.md`.
