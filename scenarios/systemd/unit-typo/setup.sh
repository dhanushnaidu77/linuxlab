on app01 <<'X'
f=/etc/systemd/system/darkroom-api.service
cp $f /root/darkroom-api.service.orig
sed -i 's#ExecStart=/usr/bin/python3#ExecStart=/usr/bin/pyhton3#' $f
sed -i '/^User=darkroom/a Environment=DARKROOM_ENV=prod' $f
systemctl daemon-reload; systemctl restart darkroom-api 2>/dev/null; true
X
