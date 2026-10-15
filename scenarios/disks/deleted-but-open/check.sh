on app01 '[ $(df --output=pcent /srv/logs | tail -1 | tr -dc 0-9) -lt 50 ]' || fail "df still shows /srv/logs at $(on app01 "df --output=pcent /srv/logs | tail -1 | tr -d ' '")"
on app01 'test -f /srv/logs/app.log' || fail "the current app.log is gone, did someone rm -rf the dir?"
