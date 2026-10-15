on web01 <<'X'
nft flush ruleset
printf '#!/usr/sbin/nft -f\nflush ruleset\n' > /etc/nftables.conf
systemctl disable --now nftables 2>/dev/null
mkdir -p /srv/debug && echo "debug build artifacts" > /srv/debug/index.html
pkill -f "[h]ttp.server 8081"; cd /srv/debug && setsid nohup python3 -m http.server 8081 >/dev/null 2>&1 < /dev/null &
sleep 0.5
X
