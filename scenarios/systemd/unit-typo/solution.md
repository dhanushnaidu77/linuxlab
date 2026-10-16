## What was wrong
`ExecStart=/usr/bin/pyhton3 ...` — a typo. systemd reports `status=203/EXEC` when it can't execute the binary.

## Fix
```bash
ssh app01
systemctl status darkroom-api                   # 203/EXEC
journalctl -u darkroom-api -n 20                # "Failed to locate executable /usr/bin/pyhton3"
systemctl cat darkroom-api
sudo systemctl edit --full darkroom-api         # or fix with sed/vim
sudo systemctl daemon-reload                   # required after editing unit files
sudo systemctl restart darkroom-api
```

## Notes
- Prefer `systemctl edit darkroom-api` (drop-in override in `/etc/systemd/system/darkroom-api.service.d/`) for small changes like
  adding `Environment=` — it survives package upgrades of the main unit.
- Common exit codes: 203 = EXEC (binary not found/not executable), 217 = USER (User= doesn't exist), 200 = CHDIR.
