on rtr01 <<'X'
cp /etc/nftables.conf /root/nftables.conf.orig
cat > /etc/nftables.conf <<'NFT'
#!/usr/sbin/nft -f
# Darkroom Labs edge/core router firewall
flush ruleset

table inet filter {
  chain input {
    type filter hook input priority 0; policy accept;
  }
  chain forward {
    type filter hook forward priority 0; policy accept;
    ct state established,related accept
    # CHG-2291: DMZ must not reach backend databases (leah)
    ip saddr 10.10.2.0/24 ip daddr 10.10.3.0/24 tcp dport 5432 drop
    ip saddr 10.10.2.0/24 ip daddr 10.10.3.0/24 tcp dport 8080 drop
  }
  chain output {
    type filter hook output priority 0; policy accept;
  }
}
NFT
nft -f /etc/nftables.conf
X
