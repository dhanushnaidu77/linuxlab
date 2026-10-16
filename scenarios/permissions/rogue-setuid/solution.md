## Fix
```bash
sudo find / -xdev -perm -4000 -type f 2>/dev/null
sudo find / -xdev -perm -4000 -type f 2>/dev/null | while read f; do dpkg -S "$f" >/dev/null 2>&1 || echo "NOT PACKAGED: $f"; done
ls -l /usr/local/sbin/{{NAME}}      # -rwsr-xr-x root root
cmp /usr/local/sbin/{{NAME}} /bin/bash && echo "it's a copy of bash"
```

## Why this is bad
A setuid-root bash (`bash -p`) gives anyone who can run it a root shell. `-perm -4000` matches files with *at least* the setuid bit;
`-perm -2000` finds setgid. Keep a baseline list of setuid files and diff it regularly (AIDE, osquery, or a simple cron).
