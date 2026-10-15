on app01 "sed -i '/^\[server\]/,/^\[/ s/^port = .*/port = 8080/' /etc/kestrel/api.conf && systemctl restart kestrel-api && sleep 1"
