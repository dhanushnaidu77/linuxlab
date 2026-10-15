## What was wrong
The `[server]` section was deleted from `/etc/kestrel/api.conf`, so the service exited at startup.

## Fix
```bash
ssh app01
ls -lt /var/backups/kestrel/                 # newest first
diff /var/backups/kestrel/api.conf.20261001.bak /etc/kestrel/api.conf
sudo cp /var/backups/kestrel/api.conf.20261001.bak /etc/kestrel/api.conf
sudo systemctl restart kestrel-api
systemctl status kestrel-api
curl localhost:8080/health
```

## Lessons
- Always `diff` a backup against the current file before restoring — the older backups here pointed at a decommissioned DB.
- Before editing configs: `sudo cp file{,.$(date +%F)}` makes a dated copy in one go.
