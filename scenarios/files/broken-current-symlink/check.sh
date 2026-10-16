on app01 '[ "$(readlink -f /opt/darkroom/current)" = "/opt/darkroom/releases/$GOOD" ]' || fail "/opt/darkroom/current doesn't point at the newest release ($GOOD)"
on app01 'test -L /opt/darkroom/current' || fail "current should still be a symlink, not a copied directory (deploys swap the link)"
on app01 'systemctl is-active -q reports-worker' || fail "reports-worker still isn't running"
