echo "ANSWER=$(on app01 "zgrep -h 'export job failed' /var/log/darkroom/api.log* | grep -o 'req=[^ ]*' | cut -d= -f2")"
