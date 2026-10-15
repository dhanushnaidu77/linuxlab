## Fix
```bash
ssh app01
sudo tcpdump -lni eth0 -A 'tcp dst port 80' | grep -i authorization
# Authorization: Basic c3ZjLXJlcG9ydHM6U3VtbWVyMjAyNiE=
echo 'c3ZjLXJlcG9ydHM6U3VtbWVyMjAyNiE=' | base64 -d
# {{USER}}:Summer2026!
```

## Lessons
- HTTP Basic auth is **encoding, not encryption** — anyone on the path can read it. Use HTTPS.
- `-l` line-buffers tcpdump output so piping to grep works live.
- Find the sender on app01: `sudo ss -tnp 'dport = :80'`, `ps aux | grep curl`, or check cron/systemd timers.
