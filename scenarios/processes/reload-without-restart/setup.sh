on app01 <<'X'
cat > /opt/kestrel/feeder.py <<'PY'
#!/usr/bin/env python3
import signal, time
def load(*_):
    rate = "?"
    for line in open("/etc/kestrel/feeder.conf"):
        if line.startswith("rate="): rate = line.split("=", 1)[1].strip()
    open("/run/feeder.state", "w").write(f"active_rate={rate}\n")
signal.signal(signal.SIGHUP, load)
load()
while True: time.sleep(1)
PY
chmod 755 /opt/kestrel/feeder.py
printf '# market feeder\nrate=10\nupstream=feed.kestrel.internal\n' > /etc/kestrel/feeder.conf
pkill -f '[f]eeder.py'; sleep 0.2
setsid nohup /opt/kestrel/feeder.py >/dev/null 2>&1 < /dev/null &
sleep 0.5
pgrep -f '[p]ython3 /opt/kestrel/feeder.py' > /root/.feeder.pid
X
