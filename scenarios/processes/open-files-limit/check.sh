on app01 'for i in 1 2 3 4; do systemctl is-active -q ingest && journalctl -u ingest -n 5 --no-pager -o cat | grep -q "holding 2000" && exit 0; sleep 1; done; exit 1' \
  || fail "ingest still crashes with Too many open files"
n=$(on app01 'systemctl show ingest -p LimitNOFILE --value')
[ "$n" -ge 2048 ] || fail "service is up but LimitNOFILE is only $n"
