## Fix
```bash
ssh app01
sudo visudo -f /etc/sudoers.d/{{USER}}
#   {{USER}} ALL=(root) NOPASSWD: /usr/bin/systemctl restart kestrel-api
sudo visudo -c                         # validate everything
sudo -l -U {{USER}}                    # what may they run?
sudo -u {{USER}} sudo -n systemctl restart kestrel-api   # test it
```

## Notes
- Always use **full paths** in sudoers; a bare `systemctl` won't match.
- Arguments are part of the rule: this allows *exactly* `restart kestrel-api`, not `stop` or other units.
- Never edit `/etc/sudoers` with a normal editor — one typo and nobody can sudo. `visudo` refuses to save broken syntax.
