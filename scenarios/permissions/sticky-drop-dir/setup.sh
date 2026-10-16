on app01 'for u in omar grace; do id $u >/dev/null 2>&1 || useradd -m $u; done; rm -rf /srv/drop; mkdir -p /srv/drop; chmod 0777 /srv/drop'
