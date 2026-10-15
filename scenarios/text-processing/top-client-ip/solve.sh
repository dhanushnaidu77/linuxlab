echo "ANSWER=$(on web01 "awk '{print \$1}' /var/log/nginx/kestrel.access.log | sort | uniq -c | sort -rn | head -1 | awk '{print \$2}'")"
