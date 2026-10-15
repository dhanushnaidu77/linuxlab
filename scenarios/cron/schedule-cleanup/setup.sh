on app01 <<'X'
printf '#!/bin/bash\nfind /tmp -maxdepth 1 -user kestrel -mmin +60 -delete 2>/dev/null\necho "$(date -Is) cleanup ran" >> /var/log/kestrel/cleanup.log\n' > /opt/kestrel/cleanup-tmp.sh
chmod 755 /opt/kestrel/cleanup-tmp.sh
crontab -r -u kestrel 2>/dev/null; rm -f /etc/cron.d/*cleanup*; true
X
