on app01 <<'X'
printf '#!/bin/bash\nwhile :; do sleep 5; done\n' > /usr/local/bin/$NAME; chmod 755 /usr/local/bin/$NAME
pkill -x "$NAME" 2>/dev/null
setsid nohup /usr/local/bin/$NAME >/dev/null 2>&1 < /dev/null &
sleep 0.3
echo PID=$(pgrep -x "$NAME")
X
