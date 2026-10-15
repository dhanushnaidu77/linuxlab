on app01 'id "$USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$USER"; rm -rf /home/$USER/.ssh'
on jump01 <<'X'
rm -f /root/.lab-$USER /root/.lab-$USER.pub
ssh-keygen -q -t ed25519 -N '' -C "$USER@laptop" -f /root/.lab-$USER
install -d -o dhan -g dhan /home/dhan/inbox
cp /root/.lab-$USER.pub /home/dhan/inbox/$USER.pub; chown dhan:dhan /home/dhan/inbox/$USER.pub
X
