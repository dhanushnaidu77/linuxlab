## Fix
```bash
ssh ns01
grep -A3 darkroom.internal /etc/bind/named.conf.local     # zone file location
sudoedit /etc/bind/db.darkroom.internal
#   bump the serial (YYYYMMDDNN convention), add:
#   {{NAME}}  IN A {{IP}}
sudo named-checkzone darkroom.internal /etc/bind/db.darkroom.internal
sudo rndc reload                                          # or: sudo systemctl reload named
dig +short {{NAME}}.darkroom.internal @localhost
```

## Notes
- The **serial** tells secondary servers the zone changed. Forget it and they keep serving the old data.
- Names without a trailing dot are relative to the zone (`{{NAME}}` → `{{NAME}}.darkroom.internal.`). A missing
  trailing dot on a fully-qualified name (`www.darkroom.internal`) is the classic mistake → `www.darkroom.internal.darkroom.internal.`
- `named-checkconf` validates the main config the same way.
