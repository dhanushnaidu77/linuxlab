re='^\s*(\*/15|0,15,30,45|0-59/15)\s+\*\s+\*\s+\*\s+\*\s+'
if on app01 "crontab -l -u kestrel 2>/dev/null | grep -E '${re}.*cleanup-tmp\.sh'" >/dev/null; then exit 0; fi
on app01 "cat /etc/cron.d/* 2>/dev/null | grep -E '${re}kestrel\s+.*cleanup-tmp\.sh'" >/dev/null && exit 0
on app01 "crontab -l 2>/dev/null | grep -q cleanup-tmp; cat /etc/crontab /etc/cron.d/* 2>/dev/null | grep -E 'root\s+.*cleanup-tmp'" >/dev/null && fail "it's scheduled, but as root — I asked for the kestrel user"
fail "I don't see a cron entry running cleanup-tmp.sh every 15 minutes as kestrel"
