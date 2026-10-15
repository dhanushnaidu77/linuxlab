on app01 <<'X'
id tom >/dev/null 2>&1 || useradd -m -s /bin/bash tom
systemctl stop kestrel-api
mkdir -p /home/tom/share && chown tom: /home/tom/share
setsid -f runuser -u tom -- sh -c 'cd /home/tom/share && exec python3 -m http.server 8080' >/dev/null 2>&1 < /dev/null
sleep 0.7
systemctl start kestrel-api 2>/dev/null; true
X
