on app01 <<'X'
cat > /opt/darkroom/feeder.py <<'PY'
#!/usr/bin/env python3
import signal, time
def load(*_):
    rate = "?"
    for line in open("/etc/darkroom/feeder.conf"):
        if line.startswith("rate="): rate = line.split("=", 1)[1].strip()
    open("/run/feeder.state", "w").write(f"active_rate={rate}\n")
signal.signal(signal.SIGHUP, load)
load()
while True: time.sleep(1)
PY
chmod 755 /opt/darkroom/feeder.py
printf '# market feeder\nrate=10\nupstream=feed.darkroom.internal\n' > /etc/darkroom/feeder.conf
pkill -f '[f]eeder.py'; sleep 0.2
setsid nohup /opt/darkroom/feeder.py >/dev/null 2>&1 < /dev/null &
sleep 0.5
pgrep -f '[p]ython3 /opt/darkroom/feeder.py' > /root/.feeder.pid
X
