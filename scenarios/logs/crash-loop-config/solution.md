## Investigate
```bash
ssh app01
systemctl status kestrel-api            # "activating (auto-restart)", restart counter climbing
journalctl -u kestrel-api -n 30 --no-pager
# FATAL: bad config: invalid literal for int() with base 10: '{{BAD}}'
grep -n port /etc/kestrel/api.conf
```

## Fix
```bash
sudoedit /etc/kestrel/api.conf        # [server] port = 8080 — careful, [database] also has a port line
# or, scoped to the [server] section only:
sudo sed -i '/^\[server\]/,/^\[/ s/^port = .*/port = 8080/' /etc/kestrel/api.conf
sudo systemctl restart kestrel-api
curl localhost:8080/health
```

## Useful journalctl flags
- `-u <unit>` one service · `-f` follow · `-n 50` last 50 lines · `-p err` only errors
- `--since "10 min ago"` · `-b` this boot · `-o cat` message text only
