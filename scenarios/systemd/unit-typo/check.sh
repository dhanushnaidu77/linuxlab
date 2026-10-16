on app01 'systemctl is-active -q darkroom-api' || fail "still won't start, same 203 error"
on app01 'systemctl show darkroom-api -p Environment | grep -q DARKROOM_ENV=prod' || fail "it runs but my DARKROOM_ENV=prod setting is gone, I need that"
on app01 'systemctl show darkroom-api -p NeedDaemonReload | grep -q =no' || fail "systemd says the unit file changed on disk but wasn't reloaded"
