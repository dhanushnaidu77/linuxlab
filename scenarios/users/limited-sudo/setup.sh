on app01 'id "$USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$USER"; rm -f /etc/sudoers.d/$USER; gpasswd -d "$USER" sudo 2>/dev/null; true'
