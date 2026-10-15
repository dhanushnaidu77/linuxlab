## Investigate
```bash
ssh app01
df -h /srv/uploads                                   # which filesystem, how full
sudo du -sh /srv/uploads/* /srv/uploads/.[!.]* | sort -h   # include hidden dirs!
sudo du -ah /srv/uploads | sort -h | tail             # biggest files anywhere below
```
`du -sh /srv/uploads/*` alone misses `.{{JUNK}}` because `*` doesn't match dotfiles.

## Fix
```bash
sudo rm -rf /srv/uploads/.{{JUNK}}
df -h /srv/uploads
```

## Notes
- `ncdu -x /srv` is the friendliest interactive tool (`-x` stays on one filesystem).
- Always double-check the path before `rm -rf` — tab-complete it, or `ls` it first.
