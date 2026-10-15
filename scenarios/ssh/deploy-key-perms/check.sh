as_user jump01 dhan 'ssh -o BatchMode=yes -o ConnectTimeout=4 deploy@web01 true' >/dev/null 2>&1 || fail "still fails: ssh deploy@web01 asks for a password"
on web01 'p=$(stat -c %a /home/deploy); [ $((0$p & 022)) -eq 0 ]' || fail "it works but /home/deploy is still writable by others — security will flag that"
