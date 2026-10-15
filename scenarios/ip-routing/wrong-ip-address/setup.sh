on web01 'ip addr flush dev eth0 && ip addr add $NEWIP/24 dev eth0 && ip route replace default via 10.10.2.1'
