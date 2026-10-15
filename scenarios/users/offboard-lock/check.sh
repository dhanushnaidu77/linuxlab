on jump01 'id "$USER"' >/dev/null 2>&1 || fail "the account was deleted — legal needed it kept!"
on jump01 'test -f /home/$USER/handover.txt' || fail "their home directory contents are gone — legal hold!"
on jump01 '[ "$(passwd -S $USER | cut -d" " -f2)" = L ]' || fail "their password still works"
as_user jump01 dhan "ssh -o BatchMode=yes -o ConnectTimeout=3 $USER@localhost true" >/dev/null 2>&1 && fail "I just tested: they can still log in over SSH with their key"
exit 0
