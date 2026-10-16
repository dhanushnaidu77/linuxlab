on app01 'id carlos >/dev/null 2>&1 || useradd -m carlos; printf "DB_PASSWORD=darkroom-lab\n" > /etc/darkroom/db.secret; chown root:root /etc/darkroom/db.secret; chmod 644 /etc/darkroom/db.secret'
