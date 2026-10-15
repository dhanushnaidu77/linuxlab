on app01 'pid=$(ps -eo pid,comm --sort=-%cpu | awk "NR==2{print \$1}"); kill $pid; sleep 0.5'
