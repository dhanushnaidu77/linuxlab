## What was wrong
The `[server]` section was deleted from `/etc/darkroom/api.conf`, so the service exited at startup.

## Fix
```bash
ssh app01
ls -lt /var/backups/darkroom/                 # newest first
diff /var/backups/darkroom/api.conf.20261001.bak /etc/darkroom/api.conf
sudo cp /var/backups/darkroom/api.conf.20261001.bak /etc/darkroom/api.conf
sudo systemctl restart darkroom-api
systemctl status darkroom-api
curl localhost:8080/health
```

## Lessons
- Always `diff` a backup against the current file before restoring — the older backups here pointed at a decommissioned DB.
- Before editing configs: `sudo cp file{,.$(date +%F)}` makes a dated copy in one go.
