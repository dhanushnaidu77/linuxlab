on jump01 "ssh -i /root/.lab-$USER -o BatchMode=yes -o ConnectTimeout=4 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $USER@app01 true" >/dev/null 2>&1 \
  || fail "$USER says: Permission denied (publickey) when connecting to app01"
on app01 '[ "$(stat -c %U /home/$USER/.ssh/authorized_keys)" = "$USER" ]' || fail "works, but authorized_keys isn't owned by $USER"
