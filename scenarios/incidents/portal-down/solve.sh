on web01 'sed -i "s/^\(\s*index index.html\)$/\1;/" /etc/nginx/sites-available/kestrel && nginx -t 2>/dev/null && systemctl start nginx'
on app01 'systemctl start kestrel-api && sleep 1'
