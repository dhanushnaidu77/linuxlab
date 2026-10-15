on app01 'systemctl is-active -q kestrel-api' || fail "dashboard still says service unavailable"
on app01 'curl -fsS -m 3 localhost:8080/health >/dev/null' || fail "it's up-ish but /health isn't answering"
on app01 'systemctl is-enabled -q kestrel-api' || fail "it works now, but marcus says it won't come back after a reboot (not enabled)"
