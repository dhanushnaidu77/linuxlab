on db01 <<'X'
f=/etc/postgresql/16/main/postgresql.conf
sed -i "s/^listen_addresses.*/listen_addresses = 'localhost'/" $f
systemctl restart postgresql
nft add table inet filter
nft add chain inet filter input '{ type filter hook input priority 0; policy accept; }'
nft add rule inet filter input tcp dport 5432 drop
X
