on app01 <<'X'
cat > /usr/local/bin/legacy-sync <<SH
#!/bin/bash
while :; do curl -s -o /dev/null -u '$USER:Summer2026!' http://web01.darkroom.internal/private/; sleep 2; done
SH
chmod 755 /usr/local/bin/legacy-sync
pkill -x legacy-sync; setsid -f /usr/local/bin/legacy-sync >/dev/null 2>&1 < /dev/null
X
