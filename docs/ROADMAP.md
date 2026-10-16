# Darkroom Labs — immersion roadmap

Agreed 2026-10-16. Ordered by impact. Each item gets its own short design before building.

1. ~~**AI coworker replies**~~ — done (key added 2026-10-16).
2. ~~**Background chatter**~~ — done (Live mode) — coworkers talk to each other in channels (deploy announcements, "anyone else seeing slowness?",
   status chatter), occasionally containing clues for open tickets. Work-related only — **no lunch plans / social filler**.
3. ~~**Unfolding incidents**~~ — done (Live mode, `timeline:` in scenario.yaml) — alerts with a timeline: a coworker joins the thread, the CTO asks for an ETA after N minutes, and
   the fault can worsen if left alone (e.g. a disk keeps filling). Shares the scripted-timeline plumbing with (2).
4. **Real monitoring** — a status/metrics page in the console (CPU, disk, API latency, error rate per host) and alerts that fire
   from actual thresholds instead of only from scenarios.
5. **Shifts & status** — "on shift"/"away"; tickets only arrive on shift; an end-of-day summary to a manager persona
   (tickets closed, response times, hints used).
6. **Postmortems** — some tickets close only after a short root-cause write-up; Claude grades clarity, scripts still grade the fix.
7. **Ticket chains** — follow-ups to earlier tickets ("the cert you renewed expires in 3 days — automate it").

## Done
- Easy tickets mixed in at any level (~20%, `EASY_SHARE` in `server/scheduler.js`).
- Reset everything (Settings → Start over).
- Live mode toggle (header pill / Settings): chatter from `data-defs/chatter.yaml` every 20–40 min, and scenario
  `timeline:` entries (`at` minutes, `persona`, `text`, optional `channel`, optional `run` escalation script).
