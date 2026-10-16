## Fix
```bash
ssh app01
grep -rn 'db-legacy' /etc/darkroom/conf.d                       # look first: note the *-replica host!
grep -rl 'db-legacy\.darkroom\.internal' /etc/darkroom/conf.d \
  | xargs sudo sed -i.bak 's/db-legacy\.darkroom\.internal/db01.darkroom.internal/g'
grep -rn 'db-legacy' /etc/darkroom/conf.d                       # only the replica lines remain
```

## Gotchas
- In a regex `.` matches any character — escape dots in hostnames.
- `db-legacy.darkroom.internal` is not a substring of `db-legacy-replica.darkroom.internal`, but a lazy pattern like `s/db-legacy/db01/g` would hit both.
- `/g` replaces every occurrence on a line, not just the first.
- `sed -i.bak` keeps a backup of each file; clean them up afterwards (or don't use it in conf.d dirs that load `*`).
