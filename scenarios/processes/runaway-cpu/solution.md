## Fix
```bash
ssh app01
uptime                                  # load average confirms it
ps aux --sort=-%cpu | head -5           # or: top, then press P
sudo kill <PID>                         # SIGTERM: polite, lets it clean up
sudo kill -9 <PID>                      # SIGKILL: only if TERM is ignored
```

## Notes
- `pkill -x {{PROC}}` / `pgrep -a {{PROC}}` find processes by name.
- Load average ≈ number of runnable processes; on a 4-core box, a load of 4 is "fully busy".
- Find who started it: `ps -o pid,ppid,user,lstart,cmd -p <PID>` and look at the parent.
