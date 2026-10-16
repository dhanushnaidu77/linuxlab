on app01 <<'X'
rm -f /etc/logrotate.d/darkroom* /var/log/darkroom/report.log.*
for i in $(seq 1 5000); do echo "2026-10-$((RANDOM%15+1)) report written to /srv/reports/report-x.csv"; done > /var/log/darkroom/report.log
chown darkroom:darkroom /var/log/darkroom/report.log
X
