## Fix
```bash
ssh app01
top                                   # NI column; or: ps -o pid,ni,pcpu,comm -C reindex
sudo renice -n 19 -p $(pgrep -x reindex)
```

## Notes
- Niceness ranges -20 (most favoured) to 19 (least). Only root can lower it (make more important).
- Start jobs nice from the beginning: `nice -n 19 ./reindex`; for disk-heavy jobs also `ionice -c3` (idle I/O class).
- For services: `Nice=` / `CPUWeight=` in the systemd unit, or `systemd-run --nice=19 ...`.
