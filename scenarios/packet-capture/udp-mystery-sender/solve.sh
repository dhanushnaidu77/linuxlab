echo "ANSWER=$(on db01 "timeout 5 tcpdump -lni eth0 -c 1 udp port $PORT 2>/dev/null | awk '{print \$3}' | sed 's/\.[0-9]*\$//'")"
