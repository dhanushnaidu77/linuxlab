on web01 'ip -4 addr show dev eth0 | grep -q "inet 10.10.2.10/24"' || fail "web01 still isn't on 10.10.2.10"
on web01 'ip route show default | grep -q "via 10.10.2.1"' || fail "web01 is on .10 again but has no default route — can't reach the office"
on jump01 'curl -fsS -m 3 http://web01.darkroom.internal/ >/dev/null' || fail "http://web01.darkroom.internal still doesn't load from the office"
