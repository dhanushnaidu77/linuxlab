on web01 'ip -4 addr show dev eth0 | grep -q "inet 10.10.2.10/24" || { ip addr flush dev eth0; ip addr add 10.10.2.10/24 dev eth0; }; ip route replace default via 10.10.2.1'
