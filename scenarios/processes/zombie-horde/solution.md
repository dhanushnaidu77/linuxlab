## Investigate
```bash
ssh app01
ps -eo pid,ppid,stat,etime,comm | awk '$3 ~ /^Z/'   # STAT Z = zombie, note the PPID
ps -o pid,cmd -p <PPID>                           # job-dispatcher
```

## Fix
```bash
sudo kill <PPID>          # parent dies → zombies are re-parented to PID 1, which reaps them instantly
```

## Root cause (for Marcus)
job-dispatcher forks children but never calls `wait()`, so each exited child stays in the process table as `<defunct>`
holding a PID. Zombies use no CPU/memory, but enough of them exhaust the PID space (`/proc/sys/kernel/pid_max`).
You can't kill a zombie — it's already dead. Fix the parent (reap children, or `signal(SIGCHLD, SIG_IGN)`).
