## What was wrong
`ExecStart=/usr/bin/pyhton3 ...` — a typo. systemd reports `status=203/EXEC` when it can't execute the binary.

## Fix
```bash
ssh app01
systemctl status kestrel-api                   # 203/EXEC
journalctl -u kestrel-api -n 20                # "Failed to locate executable /usr/bin/pyhton3"
systemctl cat kestrel-api
sudo systemctl edit --full kestrel-api         # or fix with sed/vim
sudo systemctl daemon-reload                   # required after editing unit files
sudo systemctl restart kestrel-api
```

## Notes
- Prefer `systemctl edit kestrel-api` (drop-in override in `/etc/systemd/system/kestrel-api.service.d/`) for small changes like
  adding `Environment=` — it survives package upgrades of the main unit.
- Common exit codes: 203 = EXEC (binary not found/not executable), 217 = USER (User= doesn't exist), 200 = CHDIR.
