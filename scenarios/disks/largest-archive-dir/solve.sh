echo "ANSWER=$(on db01 "du -s /srv/archive/* | sort -n | tail -1 | awk '{print \$2}' | xargs basename")"
