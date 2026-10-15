on app01 <<'X'
printf '#!/bin/bash\n# batch job (stuck)\nwhile :; do :; done\n' > /usr/local/bin/$PROC
chmod 755 /usr/local/bin/$PROC
pkill -x "$PROC" 2>/dev/null
setsid nohup /usr/local/bin/$PROC >/dev/null 2>&1 < /dev/null &
sleep 0.5
X
