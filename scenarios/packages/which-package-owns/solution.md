## Fix
```bash
dpkg -S {{BIN}}                       # "{{PKG}}: {{BIN}}"
dpkg -S "$(readlink -f {{BIN}})"      # if it's a symlink (alternatives!), resolve it first
```

## usrmerge gotcha
On modern Ubuntu `/bin` is a symlink to `/usr/bin`, but some packages still *register* their files under `/bin/...`.
So `dpkg -S /usr/bin/ss` says "no path found" while `dpkg -S /bin/ss` (or just `dpkg -S ss`, a pattern match) works.

## Related
- `dpkg -L {{PKG}}` — every file a package installed
- `apt-file search <name>` — which package *would* provide a file (needs the apt-file index)
- `which`/`command -v` find the binary; `type -a` shows aliases/functions too
