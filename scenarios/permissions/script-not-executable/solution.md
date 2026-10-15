## What was wrong
`/opt/kestrel/nightly-report.sh` had mode `644` (`rw-r--r--`) — no execute bit for anyone.

## Fix
```bash
ssh app01
ls -l /opt/kestrel/nightly-report.sh
sudo chown root:root /opt/kestrel/nightly-report.sh
sudo chmod 755 /opt/kestrel/nightly-report.sh
sudo -u kestrel /opt/kestrel/nightly-report.sh    # test as the user that actually runs it
```

## Notes
- Octal: r=4, w=2, x=1 → `755` = owner rwx, group r-x, others r-x.
- Never "fix" this with `chmod 777` — anyone could then edit a script that runs on a schedule.
- `sudo -u <user> <cmd>` is the quickest way to reproduce a permission problem as the affected user.
