on app01 "grep -rl 'db-legacy\.darkroom' /etc/darkroom/conf.d | xargs sed -i 's/db-legacy\.darkroom\.internal/db01.darkroom.internal/g'"
