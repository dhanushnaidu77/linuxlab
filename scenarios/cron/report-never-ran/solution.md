## Investigate
```bash
ssh app01
cat /etc/cron.d/nightly-report
ls -l /etc/cron.d/
journalctl -u cron --since today          # "(*system*nightly-report) WRONG FILE MODE"
```

## Fix
```bash
sudo chmod 644 /etc/cron.d/nightly-report      # cron ignores group/world-writable files
sudo -u darkroom /opt/darkroom/nightly-report.sh # run today's report as the right user
ls -l /srv/reports/
```

## Notes
- `/etc/cron.d/*` and `/etc/crontab` have a **user** field (6th column); `crontab -e` files don't.
- Files in `/etc/cron.d` must be owned by root, not writable by group/others, and have no dots in the name.
- Running the job as root would create a root-owned file the real job can't overwrite tomorrow.
