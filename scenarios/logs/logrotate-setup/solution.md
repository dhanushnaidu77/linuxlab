## Fix
```
# /etc/logrotate.d/kestrel-report
/var/log/kestrel/report.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  su kestrel kestrel
}
```
```bash
sudo logrotate -d /etc/logrotate.d/kestrel-report   # dry run — read the output!
sudo logrotate -f /etc/logrotate.d/kestrel-report   # force one rotation
ls -l /var/log/kestrel/
```

## The gotcha
`/var/log/kestrel` is owned by `kestrel`, not root. logrotate refuses to work in a directory a non-root user can write
("parent directory has insecure permissions") because that user could swap files for symlinks. `su kestrel kestrel`
makes logrotate drop to that user for this log.

## Other directives worth knowing
`delaycompress` (keep .1 uncompressed for apps still writing), `copytruncate` (for apps that never reopen their log),
`postrotate ... endscript` (e.g. `systemctl reload nginx`), `size 100M`, `dateext`.
