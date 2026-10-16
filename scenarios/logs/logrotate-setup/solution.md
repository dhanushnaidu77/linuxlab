## Fix
```
# /etc/logrotate.d/darkroom-report
/var/log/darkroom/report.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  su darkroom darkroom
}
```
```bash
sudo logrotate -d /etc/logrotate.d/darkroom-report   # dry run — read the output!
sudo logrotate -f /etc/logrotate.d/darkroom-report   # force one rotation
ls -l /var/log/darkroom/
```

## The gotcha
`/var/log/darkroom` is owned by `darkroom`, not root. logrotate refuses to work in a directory a non-root user can write
("parent directory has insecure permissions") because that user could swap files for symlinks. `su darkroom darkroom`
makes logrotate drop to that user for this log.

## Other directives worth knowing
`delaycompress` (keep .1 uncompressed for apps still writing), `copytruncate` (for apps that never reopen their log),
`postrotate ... endscript` (e.g. `systemctl reload nginx`), `size 100M`, `dateext`.
