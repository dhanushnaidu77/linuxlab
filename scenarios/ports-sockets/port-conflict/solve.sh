on app01 'kill $(ss -ltnpH "sport = :8080" | grep -o "pid=[0-9]*" | cut -d= -f2 | sort -u); sleep 0.5; systemctl restart darkroom-api; sleep 1'
