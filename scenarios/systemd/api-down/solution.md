## Fix
```bash
ssh app01
systemctl status darkroom-api            # inactive (dead), disabled
sudo systemctl enable --now darkroom-api # start now + start at boot
curl localhost:8080/health
```

## Notes
- **active** = running right now; **enabled** = starts at boot. They are independent.
- `systemctl list-units --type=service --state=failed` shows broken services at a glance.
- `journalctl -u darkroom-api -n 50` shows its recent logs.
