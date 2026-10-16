echo "ANSWER=$(on app01 "grep -oE 'E[0-9]{4}' /var/log/darkroom/worker.log | sort -u | wc -l")"
