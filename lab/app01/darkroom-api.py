#!/usr/bin/env python3
"""Darkroom internal API — tiny stand-in service for the lab."""
import configparser, json, logging, socket, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

cfg = configparser.ConfigParser()
if not cfg.read("/etc/darkroom/api.conf"):
    print("FATAL: cannot read /etc/darkroom/api.conf", file=sys.stderr); sys.exit(1)
try:
    PORT = cfg.getint("server", "port")
    DB_HOST = cfg.get("database", "host")
    DB_PORT = cfg.getint("database", "port")
except Exception as e:  # noqa: BLE001
    print(f"FATAL: bad config: {e}", file=sys.stderr); sys.exit(1)

logging.basicConfig(filename=cfg.get("server", "log", fallback="/var/log/darkroom/api.log"),
                    level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

def db_ok():
    try:
        with socket.create_connection((DB_HOST, DB_PORT), timeout=2):
            return True
    except OSError:
        return False

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.rstrip("/") in ("", "/health"):
            ok = db_ok()
            body = json.dumps({"service": "darkroom-api", "db": "up" if ok else "down", "ts": int(time.time())})
            self.send_response(200 if ok else 503)
            if not ok: logging.error("health check failed: cannot reach db %s:%s", DB_HOST, DB_PORT)
        else:
            body = json.dumps({"error": "not found"}); self.send_response(404)
        self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(body.encode()); logging.info("%s %s", self.command, self.path)
    def log_message(self, *a): pass

logging.info("starting on :%s (db %s:%s)", PORT, DB_HOST, DB_PORT)
ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
