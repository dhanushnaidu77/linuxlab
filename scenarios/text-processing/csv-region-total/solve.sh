echo "ANSWER=$(on app01 'awk -F, -v r="$REGION" '"'"'$2==r {s+=$5} END {print s}'"'"' /srv/data/sales.csv')"
