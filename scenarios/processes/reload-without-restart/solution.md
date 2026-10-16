## Fix
```bash
ssh app01
pgrep -af feeder                                   # note the PID
sudo sed -i 's/^rate=.*/rate={{RATE}}/' /etc/darkroom/feeder.conf
sudo kill -HUP <PID>                               # or: sudo pkill -HUP -f '[f]eeder.py'
cat /run/feeder.state                              # active_rate={{RATE}}
pgrep -af feeder                                   # same PID as before
```

## Notes
- SIGHUP ("hang up") is conventionally used by daemons to mean "reload your config".
  nginx (`nginx -s reload`), sshd, rsyslog and many others do this.
- For systemd services, `systemctl reload <unit>` runs the unit's `ExecReload=`, which is often just `kill -HUP $MAINPID`.
- `kill -l` lists all signals.

## Gotcha: `pkill -f` can match itself
`pkill -f feeder.py` matches any process whose *command line* contains `feeder.py` — including `sudo pkill -f feeder.py`
or a `bash -c '... feeder.py ...'` wrapper. The regex `[f]eeder.py` still matches "feeder.py" but not the literal text
"[f]eeder.py", so the command never matches itself. Safest of all: look up the PID and `kill -HUP <PID>`.
