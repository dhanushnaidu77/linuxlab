## Fix
```bash
ssh ns01
grep -A3 kestrel.internal /etc/bind/named.conf.local     # zone file location
sudoedit /etc/bind/db.kestrel.internal
#   bump the serial (YYYYMMDDNN convention), add:
#   {{NAME}}  IN A {{IP}}
sudo named-checkzone kestrel.internal /etc/bind/db.kestrel.internal
sudo rndc reload                                          # or: sudo systemctl reload named
dig +short {{NAME}}.kestrel.internal @localhost
```

## Notes
- The **serial** tells secondary servers the zone changed. Forget it and they keep serving the old data.
- Names without a trailing dot are relative to the zone (`{{NAME}}` → `{{NAME}}.kestrel.internal.`). A missing
  trailing dot on a fully-qualified name (`www.kestrel.internal`) is the classic mistake → `www.kestrel.internal.kestrel.internal.`
- `named-checkconf` validates the main config the same way.
