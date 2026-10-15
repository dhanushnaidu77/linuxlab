## Fix
```bash
ssh web01
dpkg -l nginx                 # ii  nginx  {{VER}}  ...
apt-cache policy nginx        # installed vs candidate versions
nginx -v                      # upstream version only: nginx/{{UP}}
```

## Notes
Debian/Ubuntu versions look like `upstream-debianrevision` (e.g. `1.24.0-2ubuntu7.1`). Security fixes are often
**backported** into the same upstream version, so for CVE work the full package version (and the Ubuntu changelog:
`apt changelog nginx`) matters more than `nginx -v`.
