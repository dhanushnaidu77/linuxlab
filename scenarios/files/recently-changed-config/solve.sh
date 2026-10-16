echo "ANSWER=$(on web01 'find /etc -xdev -type f -mmin -60 2>/dev/null | head -1')"
