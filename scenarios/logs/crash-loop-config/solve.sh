on app01 "sed -i '/^\[server\]/,/^\[/ s/^port = .*/port = 8080/' /etc/darkroom/api.conf && systemctl restart darkroom-api && sleep 1"
