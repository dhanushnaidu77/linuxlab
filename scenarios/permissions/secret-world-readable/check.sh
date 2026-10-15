as_user app01 carlos 'cat /etc/kestrel/db.secret' >/dev/null 2>&1 && fail "a random user (carlos) can still read the secret"
as_user app01 kestrel 'cat /etc/kestrel/db.secret' >/dev/null 2>&1 || fail "now the kestrel service account can't read it either — the api will break"
on app01 '[ "$(stat -c %U /etc/kestrel/db.secret)" = root ]' || fail "file should be owned by root"
on app01 'p=$(stat -c %a /etc/kestrel/db.secret); [ $((0$p & 022)) -eq 0 ]' || fail "file is still writable by group/others"
