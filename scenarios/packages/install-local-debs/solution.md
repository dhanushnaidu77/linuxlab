## Investigate
```bash
ssh app01
ls /var/cache/darkroom/
dpkg -I /var/cache/darkroom/darkroom-cli_{{VER}}_all.deb     # Depends: darkroom-common (>= {{VER}})
```

## Fix
```bash
sudo dpkg -i /var/cache/darkroom/*.deb       # install both in one transaction
# or: sudo apt install /var/cache/darkroom/*.deb   (apt resolves deps between local files)
darkroom-cli --version
dpkg --audit                                # nothing half-configured left behind
```

## Notes
If you already ran `dpkg -i` on just the cli, it's left "unpacked, not configured" — installing the dependency
and running `sudo dpkg --configure -a` (or `apt -f install` when online) finishes the job.
