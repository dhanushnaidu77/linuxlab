on app01 'p=$(stat -c %a /etc/cron.d/nightly-report); o=$(stat -c %U /etc/cron.d/nightly-report); [ $((0$p & 022)) -eq 0 ] && [ "$o" = root ]' || fail "marcus says the cron job is still being ignored by cron (check its permissions/owner)"
on app01 'grep -qE "^[^#].*\s+darkroom\s+/opt/darkroom/nightly-report.sh" /etc/cron.d/nightly-report' || fail "the cron job definition looks broken now"
on app01 'test -s /srv/reports/report-$(date +%F).csv' || fail "finance still doesn't see today's report"
on app01 '[ "$(stat -c %U /srv/reports/report-$(date +%F).csv)" = darkroom ]' || fail "the report exists but it's owned by root — the finance export (runs as darkroom) can't overwrite it tonight"
