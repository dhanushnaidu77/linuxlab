on app01 'grep -q "^port *= *8080" /etc/darkroom/api.conf' || fail "config still looks broken, there's no [server] port in it"
on app01 'grep -q "^host *= *db01.darkroom.internal" /etc/darkroom/api.conf' || fail "the api config points at the wrong database host now"
on app01 'systemctl is-active -q darkroom-api' || fail "darkroom-api service still isn't running"
on app01 'curl -fsS -m 3 localhost:8080/health >/dev/null' || fail "api is up but /health doesn't answer on 8080"
