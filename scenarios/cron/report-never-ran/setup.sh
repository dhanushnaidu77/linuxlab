on app01 'rm -f /srv/reports/report-*.csv; chmod 664 /etc/cron.d/nightly-report; touch /etc/cron.d/nightly-report; systemctl restart cron; sleep 1.2; touch /etc/cron.d; true'
