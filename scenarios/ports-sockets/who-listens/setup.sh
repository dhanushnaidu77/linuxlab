on app01 <<'X'
printf '#!/usr/bin/python3\nimport socket,time\ns=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\ns.bind(("0.0.0.0", %s)); s.listen()\nwhile True: time.sleep(60)\n' "$PORT" > /usr/local/bin/$PROC
chmod 755 /usr/local/bin/$PROC
pkill -f "[/]usr/local/bin/$PROC"; setsid nohup /usr/local/bin/$PROC >/dev/null 2>&1 < /dev/null &
sleep 0.5
X
