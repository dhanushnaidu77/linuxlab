on app01 'id carlos >/dev/null 2>&1 || useradd -m carlos; printf "DB_PASSWORD=kestrel-lab\n" > /etc/kestrel/db.secret; chown root:root /etc/kestrel/db.secret; chmod 644 /etc/kestrel/db.secret'
