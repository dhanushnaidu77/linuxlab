on db01 "sed -i \"s/^listen_addresses.*/listen_addresses = '*'/\" /etc/postgresql/16/main/postgresql.conf; systemctl restart postgresql; nft flush ruleset"
