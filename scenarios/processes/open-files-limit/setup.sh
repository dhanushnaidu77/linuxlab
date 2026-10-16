on app01 <<'X'
mkdir -p /var/lib/ingest
cat > /opt/darkroom/ingest.py <<'PY'
#!/usr/bin/python3
import time, sys
fds = []
for i in range(2000):
    try:
        fds.append(open(f"/var/lib/ingest/part-{i % 50}.dat", "a"))
    except OSError as e:
        print(f"FATAL: cannot open file #{i}: {e}", file=sys.stderr); sys.exit(1)
print(f"ingest ready, holding {len(fds)} files", flush=True)
while True: time.sleep(60)
PY
chmod 755 /opt/darkroom/ingest.py
rm -rf /etc/systemd/system/ingest.service.d
cat > /etc/systemd/system/ingest.service <<'U'
[Unit]
Description=Darkroom ingest
[Service]
ExecStart=/usr/bin/python3 /opt/darkroom/ingest.py
LimitNOFILE=1024
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
U
systemctl daemon-reload; systemctl enable ingest >/dev/null 2>&1; systemctl restart ingest; true
X
