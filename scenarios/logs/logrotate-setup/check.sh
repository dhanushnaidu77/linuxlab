conf=$(on app01 'grep -l "report.log" /etc/logrotate.d/* 2>/dev/null | head -1')
[ -n "$conf" ] || fail "there's no logrotate config for report.log in /etc/logrotate.d"
on app01 "grep -qw daily $conf && grep -qE '^\s*rotate\s+7\b' $conf && grep -qE '^\s*compress\b' $conf" || fail "the config isn't daily / keep 7 / compressed"
on app01 "logrotate -d $conf 2>&1 | grep -qiE 'error|insecure'" && fail "logrotate dry-run shows errors for that config"
on app01 'ls /var/log/darkroom/report.log.1* >/dev/null 2>&1' || fail "it was never actually rotated — no report.log.1 file"
