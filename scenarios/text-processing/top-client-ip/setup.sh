on web01 <<'X'
set -e
f=/var/log/nginx/darkroom.access.log; : > $f
ips=(); for i in $(seq 1 15); do ips+=("10.10.$((RANDOM%3+1)).$((RANDOM%200+20))"); done
top=${ips[$((RANDOM%15))]}
paths=(/ /api/health /index.html /favicon.ico /api/orders /login)
for i in $(seq 1 1500); do
  if [ $((RANDOM%4)) -eq 0 ]; then ip=$top; else ip=${ips[$((RANDOM%15))]}; fi
  echo "$ip - - [15/Oct/2026:12:$((RANDOM%60)):$((RANDOM%60)) +0000] \"GET ${paths[$((RANDOM%6))]} HTTP/1.1\" 200 $((RANDOM%5000)) \"-\" \"curl/8.5\"" >> $f
done
echo TOP=$(awk '{print $1}' $f | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')
X
