on app01 <<'X'
cat > /etc/systemd/system/metrics-exporter.service <<'U'
[Unit]
Description=Darkroom metrics exporter
After=network.target

[Service]
User=darkroom
ExecStart=/usr/bin/python3 /opt/darkroom/metrics-exporter.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
U
pkill -f '[m]etrics-exporter'; sleep 0.3
systemctl daemon-reload && systemctl enable --now metrics-exporter && sleep 1
X
