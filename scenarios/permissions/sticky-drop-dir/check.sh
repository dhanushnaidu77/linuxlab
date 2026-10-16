as_user app01 omar 'echo hi > /srv/drop/omar-report.txt' 2>/dev/null || fail "people can't even add files to /srv/drop anymore"
as_user app01 grace 'echo hi > /srv/drop/grace-notes.txt' 2>/dev/null || fail "grace can't add files"
as_user app01 grace 'rm -f /srv/drop/omar-report.txt' 2>/dev/null
on app01 'test -f /srv/drop/omar-report.txt' || fail "grace was just able to delete omar's file again"
as_user app01 grace 'rm -f /srv/drop/grace-notes.txt' 2>/dev/null; on app01 'test ! -e /srv/drop/grace-notes.txt' || fail "now people can't delete their OWN files"
on app01 'rm -f /srv/drop/*'
