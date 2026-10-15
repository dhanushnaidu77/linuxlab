on web01 'nft flush ruleset; printf "#!/usr/sbin/nft -f\nflush ruleset\n" > /etc/nftables.conf; systemctl disable nftables 2>/dev/null; pkill -f "[h]ttp.server 8081"; true'
