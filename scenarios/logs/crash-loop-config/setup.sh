on app01 'cp /etc/darkroom/api.conf /root/api.conf.orig; sed -i "/^\[server\]/,/^\[/ s/^port = .*/port = $BAD/" /etc/darkroom/api.conf; systemctl restart darkroom-api 2>/dev/null; true'
