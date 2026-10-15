key=$(on jump01 'cat /home/dhan/inbox/$USER.pub')
on app01 "install -d -m700 -o \$USER -g \$USER /home/\$USER/.ssh && echo '$key' >> /home/\$USER/.ssh/authorized_keys && chown \$USER: /home/\$USER/.ssh/authorized_keys && chmod 600 /home/\$USER/.ssh/authorized_keys"
