## Fix
```bash
ssh app01
sudo mkdir -p /srv/shared/finance
sudo chgrp finance /srv/shared/finance
sudo chmod 2770 /srv/shared/finance     # 2 = setgid, 7 owner, 7 group, 0 others
ls -ld /srv/shared/finance              # drwxrws--- root finance
```

## Why setgid?
Without it, a file created by jenny gets group `jenny` (her private group) and omar can't edit it.
With the setgid bit on the directory, new files inherit the directory's group (`finance`).

## Other ways
- ACLs: `setfacl -m g:finance:rwx -m d:g:finance:rwx /srv/shared/finance` — default ACLs also fix the umask problem.
- Check membership with `id jenny` / `getent group finance`. Users must log in again after being added to a group.
