on web01 'cp /etc/nginx/sites-available/darkroom /root/darkroom.orig; sed -i "s/^\(\s*index index.html\);/\1/" /etc/nginx/sites-available/darkroom; systemctl restart nginx 2>/dev/null; true'
on app01 'systemctl stop darkroom-api'
