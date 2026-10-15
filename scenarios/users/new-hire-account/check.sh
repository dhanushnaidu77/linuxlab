on jump01 'id "$USER"' >/dev/null 2>&1 || fail "the user $USER doesn't exist"
on jump01 'test -d /home/$USER && [ "$(stat -c %U /home/$USER)" = "$USER" ]' || fail "$USER has no home directory (or it isn't owned by them)"
on jump01 '[ "$(getent passwd $USER | cut -d: -f7)" = /bin/bash ]' || fail "their login shell isn't bash"
on jump01 'id -nG $USER | tr " " "\n" | grep -qx devs' || fail "$USER isn't in the devs group"
