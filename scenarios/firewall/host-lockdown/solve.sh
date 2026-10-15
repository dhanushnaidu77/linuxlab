on web01 <<'X'
cat > /etc/nftables.conf <<'NFT'
#!/usr/sbin/nft -f
flush ruleset
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    iif lo accept
    ct state established,related accept
    ip protocol icmp accept
    tcp dport { 80, 443 } accept
    ip saddr 10.10.1.0/24 tcp dport 22 accept
  }
}
NFT
nft -c -f /etc/nftables.conf && systemctl enable --now nftables && nft -f /etc/nftables.conf
X
