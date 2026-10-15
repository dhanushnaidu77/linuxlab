on app01 'echo "$USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart kestrel-api" > /etc/sudoers.d/$USER && chmod 440 /etc/sudoers.d/$USER && visudo -c >/dev/null'
