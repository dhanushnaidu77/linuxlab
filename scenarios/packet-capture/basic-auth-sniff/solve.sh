b64=$(on app01 "timeout 8 tcpdump -lni eth0 -A -c 30 'tcp dst port 80' 2>/dev/null | grep -m1 -o 'Authorization: Basic [A-Za-z0-9+/=]*' | awk '{print \$3}'")
echo "ANSWER=$(echo "$b64" | base64 -d | cut -d: -f1)"
