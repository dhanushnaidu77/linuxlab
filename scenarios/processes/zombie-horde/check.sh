z=$(on app01 "ps -eo stat= | grep -c '^Z'")
[ "$z" -eq 0 ] || fail "still $z zombie processes on app01"
on app01 'sleep 2; [ $(ps -eo stat= | grep -c "^Z") -eq 0 ]' || fail "zombies came back after a couple of seconds — whatever is creating them is still running"
on app01 'systemctl is-active -q darkroom-api' || fail "darkroom-api went down in the process!"
