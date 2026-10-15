## Fix
```bash
ssh app01
ls -lSh /srv/exports | head      # -S sorts by size, largest first
```

## Other ways
- `du -ah /srv/exports | sort -h | tail -5` — works recursively, sizes on disk
- `find /srv/exports -type f -printf '%s %p\n' | sort -n | tail -1` — exact byte sizes
- `ncdu /srv` — interactive, great for "where did my disk go"
