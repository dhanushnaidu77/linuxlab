on app01 'cp /etc/kestrel/api.conf /root/api.conf.orig; sed -i "/^\[server\]/,/^\[/ s/^port = .*/port = $BAD/" /etc/kestrel/api.conf; systemctl restart kestrel-api 2>/dev/null; true'
