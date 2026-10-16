## Investigate
```bash
sudo chage -l {{USER}}
#  Password expires   : Apr 01, 2025      ← password too old
#  Account expires    : Jan 01, 2026      ← account expired too!
```

## Fix
```bash
echo '{{USER}}:Welcome-Temp-2026' | sudo chpasswd
sudo chage -E -1 {{USER}}        # remove account expiry
sudo chage -d 0 {{USER}}         # "last changed" = epoch → must change at next login (same as passwd -e)
sudo chage -l {{USER}}
```

## Notes
Password expiry (`-M`, max days) and account expiry (`-E`, a date) are different things in `/etc/shadow`
(fields 5 and 8). A locked password (`!` prefix) is a third, separate state.
