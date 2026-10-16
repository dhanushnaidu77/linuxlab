on web01 'cp /root/darkroom.orig /etc/nginx/sites-available/darkroom; systemctl restart nginx'
on app01 'systemctl start darkroom-api'
