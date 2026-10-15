## Fix
```bash
ssh app01
ls -l /var/log/kestrel/
zgrep 'export job failed' /var/log/kestrel/api.log*     # searches plain AND .gz files
```

## Notes
- `zgrep`, `zcat`, `zless`, `zdiff` work on gzip; `xzgrep`/`bzgrep` for other formats.
- `grep -o 'req=[^ ]*'` prints only the matching part.
- Logs rotate by `logrotate` (see `/etc/logrotate.d/`); `.1` is yesterday, `.2.gz` the day before, etc.
