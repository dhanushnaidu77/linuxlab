on app01 <<'X'
set -e
mountpoint -q /srv/logs && { pkill -x debug-logger || true; sleep 0.3; umount -l /srv/logs; }
mkdir -p /srv/logs && mount -t tmpfs -o size=64M tmpfs /srv/logs
cat > /usr/local/bin/debug-logger <<'SH'
#!/bin/bash
exec 3>>/srv/logs/app-debug.log
head -c 58M /dev/zero >&3
while :; do echo "$(date -Is) debug tick" >&3; sleep 5 3>&-; done
SH
chmod 755 /usr/local/bin/debug-logger
setsid nohup /usr/local/bin/debug-logger >/dev/null 2>&1 < /dev/null &
for i in $(seq 30); do [ "$(stat -c %s /srv/logs/app-debug.log 2>/dev/null || echo 0)" -ge 60000000 ] && break; sleep 0.2; done
rm -f /srv/logs/app-debug.log
echo "small" > /srv/logs/app.log
X
