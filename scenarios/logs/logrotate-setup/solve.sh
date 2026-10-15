on app01 <<'X'
printf '/var/log/kestrel/report.log {\n  daily\n  rotate 7\n  compress\n  missingok\n  notifempty\n  su kestrel kestrel\n}\n' > /etc/logrotate.d/kestrel-report
logrotate -f /etc/logrotate.d/kestrel-report
X
