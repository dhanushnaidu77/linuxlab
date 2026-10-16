on app01 'systemctl disable --now reports-worker 2>/dev/null; rm -f /etc/systemd/system/reports-worker.service; systemctl daemon-reload; rm -rf /opt/darkroom/releases /opt/darkroom/current'
