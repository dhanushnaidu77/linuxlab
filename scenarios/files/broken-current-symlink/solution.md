## Investigate
```bash
ssh app01
systemctl status reports-worker          # 203/EXEC — the binary path doesn't exist
ls -l /opt/darkroom/current              # -> /opt/darkroom/releases/2026.10.01 (red/dangling)
ls /opt/darkroom/releases/               # what's left
```

## Fix
```bash
sudo ln -sfn /opt/darkroom/releases/{{GOOD}} /opt/darkroom/current
sudo systemctl restart reports-worker
```

## Why `-n`?
Without `-n`, `ln -sf new current` when `current` is a symlink *to a directory* follows it and creates the new link
*inside* that directory. `-n` treats the existing link as a file and replaces it.
"current → release dir" symlinks are how Capistrano-style deploys switch versions atomically.
