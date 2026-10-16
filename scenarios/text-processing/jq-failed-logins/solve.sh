echo "ANSWER=$(on app01 "jq -r 'select(.result==\"failure\") | .user' /var/log/darkroom/auth.jsonl | sort | uniq -c | sort -rn | head -1 | awk '{print \$2}'")"
