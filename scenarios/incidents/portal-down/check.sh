on jump01 'curl -fsS -m 3 http://web01.kestrel.internal/ >/dev/null' || fail "the portal still doesn't load at all"
on jump01 'curl -fsS -m 4 http://web01.kestrel.internal/api/health >/dev/null' || fail "the site loads now, but the API part is still broken"
on web01 'nginx -t' >/dev/null 2>&1 || fail "nginx config still has errors"
