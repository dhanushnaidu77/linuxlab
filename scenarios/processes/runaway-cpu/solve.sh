# kill every copy (live mode may have started a second one)
on app01 'for pid in $(ps -eo pid,comm --sort=-%cpu | awk -v p="$PROC" "\$2==p {print \$1}"); do kill $pid; done; sleep 0.5'
