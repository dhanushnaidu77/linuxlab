on app01 'visudo -c >/dev/null' || fail "uh oh, sudo is now broken for everyone — sudoers has a syntax error"
as_user app01 "$USER" 'sudo -n systemctl restart darkroom-api' >/dev/null 2>&1 || fail "$USER still gets 'a password is required' / not allowed when restarting darkroom-api"
as_user app01 "$USER" 'sudo -n cat /etc/shadow' >/dev/null 2>&1 && fail "$USER can now run ANY command as root — that's way too much"
as_user app01 "$USER" 'sudo -n systemctl stop darkroom-api' >/dev/null 2>&1 && { on app01 'systemctl start darkroom-api'; fail "$USER can also stop the API, not just restart it"; }
on app01 'systemctl is-active -q darkroom-api' || fail "darkroom-api isn't running after the restart"
