## Fix
```ini
# /etc/systemd/system/metrics-exporter.service
[Unit]
Description=Darkroom metrics exporter
After=network.target

[Service]
User=darkroom
ExecStart=/usr/bin/python3 /opt/darkroom/metrics-exporter.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
```bash
sudo ss -ltnp | grep 9100            # the hand-started copy owns the port
sudo pkill -f '[m]etrics-exporter'
sudo systemctl daemon-reload
sudo systemctl enable --now metrics-exporter
systemctl status metrics-exporter
curl localhost:9100
```

## Notes
- `WantedBy=multi-user.target` is what `enable` hooks into — without `[Install]`, `enable` does nothing.
- Test your Restart= policy: `sudo kill -9 $(systemctl show -p MainPID --value metrics-exporter)` and watch it come back.
- Hardening ideas: `NoNewPrivileges=yes`, `ProtectSystem=strict`, `ProtectHome=yes`.
