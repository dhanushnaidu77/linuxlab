on "$SRC" <<'X'
cat > /usr/local/bin/heartbeat-legacy <<SH
#!/bin/bash
while :; do echo "hb \$(date +%s)" > /dev/udp/10.10.3.20/$PORT; sleep 1; done
SH
chmod 755 /usr/local/bin/heartbeat-legacy
pkill -x heartbeat-legacy; setsid -f /usr/local/bin/heartbeat-legacy >/dev/null 2>&1 < /dev/null
X
echo "SRCIP=$(on "$SRC" "ip -4 -o addr show dev eth0 | awk '{print \$4}' | cut -d/ -f1")"
