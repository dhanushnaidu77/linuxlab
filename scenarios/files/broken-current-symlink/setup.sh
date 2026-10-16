on app01 <<'X'
set -e
rm -rf /opt/darkroom/releases /opt/darkroom/current; mkdir -p /opt/darkroom/releases
for r in 2026.10.12 2026.10.13 2026.10.14; do
  mkdir -p /opt/darkroom/releases/$r
  printf '#!/bin/bash\necho "reports-worker %s started"\nexec sleep infinity\n' "$r" > /opt/darkroom/releases/$r/worker.sh
  chmod 755 /opt/darkroom/releases/$r/worker.sh
done
# newest = $GOOD: delete releases newer than it so GOOD is the latest
for r in 2026.10.12 2026.10.13 2026.10.14; do [[ $r > $GOOD ]] && rm -rf /opt/darkroom/releases/$r; done
ln -s /opt/darkroom/releases/2026.10.01 /opt/darkroom/current
cat > /etc/systemd/system/reports-worker.service <<'U'
[Unit]
Description=Darkroom reports worker
[Service]
ExecStart=/opt/darkroom/current/worker.sh
Restart=on-failure
RestartSec=2
[Install]
WantedBy=multi-user.target
U
systemctl daemon-reload; systemctl enable reports-worker >/dev/null 2>&1; systemctl restart reports-worker 2>/dev/null || true
X
