# Darkroom Labs — immersion roadmap

Agreed 2026-10-16. Ordered by impact. Each item gets its own short design before building.

1. **AI coworker replies** — add `ANTHROPIC_API_KEY` to `.env` (no code). *Pending: user adding the key.*
2. **Background chatter** — coworkers talk to each other in channels (deploy announcements, "anyone else seeing slowness?",
   status chatter), occasionally containing clues for open tickets. Work-related only — **no lunch plans / social filler**.
3. **Unfolding incidents** — alerts with a timeline: a coworker joins the thread, the CTO asks for an ETA after N minutes, and
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
