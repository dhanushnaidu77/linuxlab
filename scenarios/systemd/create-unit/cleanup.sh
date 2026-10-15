on app01 "systemctl disable --now metrics-exporter 2>/dev/null; rm -f /etc/systemd/system/metrics-exporter.service; systemctl daemon-reload; pkill -f '[m]etrics-exporter'; true"
