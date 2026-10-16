on app01 <<'X'
cat > /usr/local/bin/job-dispatcher <<'PY'
#!/usr/bin/python3
import os, time
while True:
    if os.fork() == 0:
        os._exit(0)          # child exits immediately...
    time.sleep(0.5)          # ...and the parent never wait()s → zombie
PY
chmod 755 /usr/local/bin/job-dispatcher
pkill -x job-dispatcher; setsid -f /usr/local/bin/job-dispatcher >/dev/null 2>&1 < /dev/null
sleep 3
X
