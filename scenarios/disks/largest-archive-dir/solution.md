## Fix
```bash
ssh db01
du -sh /srv/archive/* | sort -h | tail -3
```

## Notes
- `ls -l` shows a directory's own entry size (usually 4.0K), not its contents.
- `du -s` = summary per argument; `--max-depth=1` (`-d1`) is the same idea for one level of a tree: `du -h -d1 /srv | sort -h`.
- File count ≠ size: `find /srv/archive/X -type f | wc -l` would have pointed you at the wrong month.
