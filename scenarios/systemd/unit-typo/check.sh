on app01 'systemctl is-active -q kestrel-api' || fail "still won't start, same 203 error"
on app01 'systemctl show kestrel-api -p Environment | grep -q KESTREL_ENV=prod' || fail "it runs but my KESTREL_ENV=prod setting is gone, I need that"
on app01 'systemctl show kestrel-api -p NeedDaemonReload | grep -q =no' || fail "systemd says the unit file changed on disk but wasn't reloaded"
