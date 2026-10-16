## Fix
```bash
ssh app01
sudo setfacl -R -m u:auditor:rX /var/log/darkroom     # existing dir + files (X = execute only on dirs)
sudo setfacl -d -m u:auditor:rX /var/log/darkroom     # default ACL: inherited by new files
getfacl /var/log/darkroom
sudo -u auditor cat /var/log/darkroom/api.log
```

## Notes
- `ls -l` shows a `+` after the mode when a file has ACLs.
- The ACL **mask** caps group-class permissions; `chmod g-r` on an ACL'd file can silently remove the auditor's access.
- Capital `X` = execute only for directories (and files already executable) — exactly right for "read a tree".
