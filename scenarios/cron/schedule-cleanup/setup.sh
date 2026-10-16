on app01 <<'X'
printf '#!/bin/bash\nfind /tmp -maxdepth 1 -user darkroom -mmin +60 -delete 2>/dev/null\necho "$(date -Is) cleanup ran" >> /var/log/darkroom/cleanup.log\n' > /opt/darkroom/cleanup-tmp.sh
chmod 755 /opt/darkroom/cleanup-tmp.sh
crontab -r -u darkroom 2>/dev/null; rm -f /etc/cron.d/*cleanup*; true
X
