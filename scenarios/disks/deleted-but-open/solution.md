## Why df and du disagree
`rm` only removes the directory entry. If a process still has the file open, the inode and its blocks stay allocated until the
last file descriptor closes. `du` walks directories (can't see it); `df` asks the filesystem (still counts it).

## Investigate
```bash
ssh app01
df -h /srv/logs; sudo du -sh /srv/logs
sudo lsof +L1 /srv/logs             # open files with link count 0 → "(deleted)"
ls -l /proc/<PID>/fd                # app-debug.log (deleted)
```

## Fix (pick one)
```bash
sudo kill <PID>                          # or restart the service that owns it
sudo truncate -s 0 /proc/<PID>/fd/3      # free the space but keep the process running
```

## Prevent
Use logrotate with `copytruncate`, or have the app reopen its log on SIGHUP, instead of `rm`-ing live logs.
