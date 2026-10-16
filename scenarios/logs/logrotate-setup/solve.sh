on app01 <<'X'
printf '/var/log/darkroom/report.log {\n  daily\n  rotate 7\n  compress\n  missingok\n  notifempty\n  su darkroom darkroom\n}\n' > /etc/logrotate.d/darkroom-report
logrotate -f /etc/logrotate.d/darkroom-report
X
