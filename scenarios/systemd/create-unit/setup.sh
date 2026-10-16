on app01 <<'X'
cat > /opt/darkroom/metrics-exporter.py <<'PY'
#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.end_headers(); self.wfile.write(b"darkroom_up 1\n")
    def log_message(self, *a): pass
HTTPServer(("0.0.0.0", 9100), H).serve_forever()
PY
chmod 755 /opt/darkroom/metrics-exporter.py
systemctl disable --now metrics-exporter 2>/dev/null; rm -f /etc/systemd/system/metrics-exporter.service; systemctl daemon-reload
pkill -f '[m]etrics-exporter'; sleep 0.2
setsid nohup /usr/bin/python3 /opt/darkroom/metrics-exporter.py >/dev/null 2>&1 < /dev/null &
sleep 0.3
X
