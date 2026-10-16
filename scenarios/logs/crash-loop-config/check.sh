on app01 'grep -qE "^port *= *8080 *$" /etc/darkroom/api.conf' || fail "[FIRING] DarkroomApiDown — config check: port is not 8080"
on app01 'for i in 1 2 3 4 5 6; do curl -fsS -m 2 localhost:8080/health >/dev/null && exit 0; sleep 1; done; exit 1' || fail "[FIRING] DarkroomApiDown — /health on app01:8080 not responding"
