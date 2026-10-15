on web01 'cp /root/kestrel.orig /etc/nginx/sites-available/kestrel; systemctl restart nginx'
on app01 'systemctl start kestrel-api'
