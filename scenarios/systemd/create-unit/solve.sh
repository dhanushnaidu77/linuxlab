on app01 <<'X'
cat > /etc/systemd/system/metrics-exporter.service <<'U'
[Unit]
Description=Kestrel metrics exporter
After=network.target

[Service]
User=kestrel
ExecStart=/usr/bin/python3 /opt/kestrel/metrics-exporter.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
U
pkill -f '[m]etrics-exporter'; sleep 0.3
systemctl daemon-reload && systemctl enable --now metrics-exporter && sleep 1
X
