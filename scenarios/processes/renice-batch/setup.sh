on app01 <<'X'
printf '#!/bin/bash\n# reindex job\nwhile :; do :; done\n' > /usr/local/bin/reindex; chmod 755 /usr/local/bin/reindex
pkill -x reindex; setsid -f /usr/local/bin/reindex >/dev/null 2>&1 < /dev/null; sleep 0.5
pgrep -x reindex > /root/.reindex.pid
X
