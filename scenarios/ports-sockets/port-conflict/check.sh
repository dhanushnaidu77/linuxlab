on app01 'pgrep -u tom -f "[h]ttp.server" >/dev/null' && fail "tom's http.server is still holding 8080"
on app01 'for i in 1 2 3 4 5 6; do systemctl is-active -q darkroom-api && curl -fsS -m 2 localhost:8080/health | grep -q darkroom-api && exit 0; sleep 1; done; exit 1' || fail "darkroom-api still isn't answering on 8080"
