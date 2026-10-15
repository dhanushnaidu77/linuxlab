## Fix
```bash
sudo useradd -m -s /bin/bash -G devs {{USER}}
id {{USER}}
getent passwd {{USER}}
```

## Notes
- `useradd` is the low-level tool; without `-m` there's no home dir, without `-s` the shell may be `/bin/sh`.
- `adduser` (Debian/Ubuntu) is an interactive wrapper with friendlier defaults.
- Add to a group later with `usermod -aG devs <user>` — **forgetting `-a` replaces all their groups**.
