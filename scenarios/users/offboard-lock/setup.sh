on jump01 <<'X'
userdel -r "$USER" 2>/dev/null
useradd -m -s /bin/bash "$USER"
echo "$USER:Welcome2026!" | chpasswd
install -d -m 700 -o "$USER" -g "$USER" /home/$USER/.ssh
cat /home/dhan/.ssh/id_ed25519.pub > /home/$USER/.ssh/authorized_keys
chown "$USER:$USER" /home/$USER/.ssh/authorized_keys; chmod 600 /home/$USER/.ssh/authorized_keys
echo "notes for legal" > /home/$USER/handover.txt
X
