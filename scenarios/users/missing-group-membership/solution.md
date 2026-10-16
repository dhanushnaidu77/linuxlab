## Investigate
```bash
ssh app01
ls -ld /srv/deploy          # drwxr-s--- root deployers
id {{USER}}                 # groups=...,devs,builders,oncall  (no deployers)
```

## Fix
```bash
sudo usermod -aG deployers {{USER}}     # -a = append. WITHOUT -a, -G replaces ALL supplementary groups
id {{USER}}
```

## Notes
- Group changes apply to **new** login sessions; the user must log out/in (or `newgrp deployers`).
- `gpasswd -a {{USER}} deployers` is an alternative that can't accidentally wipe groups.
