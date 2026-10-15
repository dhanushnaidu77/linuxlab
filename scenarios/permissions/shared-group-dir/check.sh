D=/srv/shared/finance
on app01 "test -d $D" || fail "the folder /srv/shared/finance doesn't exist yet"
as_user app01 $U1 "umask 002; echo hi > $D/from-$U1.txt" 2>/dev/null || fail "$U1 can't create files in the folder"
as_user app01 $U2 "umask 002; echo more >> $D/from-$U1.txt" 2>/dev/null || fail "$U2 can't edit $U1's file — says permission denied"
on app01 "[ \$(stat -c %G $D/from-$U1.txt) = finance ]" || fail "new files are owned by the user's private group, not finance"
as_user app01 carlos "ls $D" >/dev/null 2>&1 && fail "carlos (not in finance) can still see what's inside"
on app01 "rm -f $D/from-$U1.txt"
exit 0
