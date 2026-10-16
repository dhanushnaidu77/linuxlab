on app01 'kill $(ps -o ppid= -p $(ps -eo pid=,stat= | awk "\$2 ~ /^Z/ {print \$1; exit}")); sleep 1'
