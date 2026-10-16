on app01 '[ "$(pgrep -x reindex)" = "$(cat /root/.reindex.pid)" ]' || fail "the reindex job was killed or restarted 😭 3 hours of work gone"
n=$(on app01 'ps -o ni= -p $(cat /root/.reindex.pid) | tr -d " "')
[ "$n" -ge 10 ] || fail "it's still running at nice $n — the API is still sluggish"
