## Investigate
```bash
ssh app01
systemctl status darkroom-api
journalctl -u darkroom-api -n 20      # OSError: [Errno 98] Address already in use
sudo ss -ltnp 'sport = :8080'        # users:(("python3",pid=...)) — not ours
ps -o pid,user,cmd -p <pid>          # tom  python3 -m http.server 8080
```

## Fix
```bash
sudo kill <pid>
sudo systemctl restart darkroom-api
curl localhost:8080/health
```
…and tell Tom to use a high random port next time 😉

## Notes
`ss` filters: `'sport = :8080'`, `'dport = :5432'`, `state established`. `-H` drops the header for scripting.
