as_user app01 "$USER" 'cat /srv/deploy/manifest.txt' >/dev/null 2>&1 || fail "$USER still gets permission denied on /srv/deploy"
for g in devs builders oncall; do on app01 "id -nG $USER | tr ' ' '\n' | grep -qx $g" || fail "$USER lost their '$g' group membership 😬 (usermod -G replaces groups!)"; done
on app01 '[ "$(stat -c %G /srv/deploy)" = deployers ] && p=$(stat -c %a /srv/deploy) && [ $((0$p & 7)) -eq 0 ]' || fail "you changed /srv/deploy's group/permissions instead of the user's groups — now other people can see it"
