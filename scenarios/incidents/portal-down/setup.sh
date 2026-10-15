on web01 'cp /etc/nginx/sites-available/kestrel /root/kestrel.orig; sed -i "s/^\(\s*index index.html\);/\1/" /etc/nginx/sites-available/kestrel; systemctl restart nginx 2>/dev/null; true'
on app01 'systemctl stop kestrel-api'
