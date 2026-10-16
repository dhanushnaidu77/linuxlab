## Fix
```bash
ssh web01
sudo find /etc -type f -mmin -60            # modified in the last 60 minutes
sudo find /etc -type f -newermt '1 hour ago' -ls
```
Then see what changed: if there's a backup or the package's original, `diff` it; `dpkg --verify` lists package files whose
checksum no longer matches. On real servers `etckeeper` (git for /etc) answers "who changed what" instantly.

## Notes
- `-mmin -60` = less than 60 min ago; `-mtime -1` = less than 24h; `+` means older than.
- `stat file` shows exact access/modify/change times.
