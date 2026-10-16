on app01 'systemctl disable --now ingest 2>/dev/null; rm -rf /etc/systemd/system/ingest.service /etc/systemd/system/ingest.service.d /var/lib/ingest; systemctl daemon-reload'
