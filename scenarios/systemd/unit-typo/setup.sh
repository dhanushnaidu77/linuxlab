on app01 <<'X'
f=/etc/systemd/system/kestrel-api.service
cp $f /root/kestrel-api.service.orig
sed -i 's#ExecStart=/usr/bin/python3#ExecStart=/usr/bin/pyhton3#' $f
sed -i '/^User=kestrel/a Environment=KESTREL_ENV=prod' $f
systemctl daemon-reload; systemctl restart kestrel-api 2>/dev/null; true
X
