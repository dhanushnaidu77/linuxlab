as_user app01 auditor 'cat /var/log/darkroom/api.log' >/dev/null 2>&1 || fail "auditor still gets Permission denied on api.log"
as_user app01 auditor 'echo x >> /var/log/darkroom/api.log' 2>/dev/null && fail "auditor can WRITE to the logs — read-only please"
on app01 '[ "$(stat -c %U:%G /var/log/darkroom)" = darkroom:darkroom ]' || fail "you changed the owner/group of /var/log/darkroom — the service needs it as is"
on app01 'p=$(stat -c %a /var/log/darkroom/api.log); [ $((0$p & 7)) -eq 0 ]' || fail "the logs are now readable by EVERYONE, not just the auditor"
as_user app01 darkroom 'echo new > /var/log/darkroom/new-$$.log' 2>/dev/null; f=$(on app01 'ls -t /var/log/darkroom/new-*.log 2>/dev/null | head -1')
as_user app01 auditor "cat $f" >/dev/null 2>&1 || { on app01 "rm -f $f"; fail "existing files work, but a NEW log file isn't readable by auditor (future files!)"; }
on app01 "rm -f $f"
