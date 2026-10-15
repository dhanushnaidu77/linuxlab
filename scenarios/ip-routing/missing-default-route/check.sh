on app01 'ip route show default | grep -q "via 10.10.3.1"' || fail "app01 still has no route back to the office — ping times out"
on jump01 'ping -c1 -W2 10.10.3.10 >/dev/null' || fail "ping from the office to app01 still times out"
