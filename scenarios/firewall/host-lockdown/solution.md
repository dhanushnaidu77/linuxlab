## Fix
```
# /etc/nftables.conf on web01
#!/usr/sbin/nft -f
flush ruleset
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    iif lo accept
    ct state established,related accept      # replies to web01's own DNS/API traffic
    ip protocol icmp accept
    tcp dport { 80, 443 } accept
    ip saddr 10.10.1.0/24 tcp dport 22 accept
  }
}
```
```bash
sudo nft -c -f /etc/nftables.conf               # syntax check first!
sudo systemctl enable --now nftables
sudo nft list ruleset
```

## Don't lock yourself out
- Keep a second ssh session open while applying rules.
- Or apply with a dead-man switch: `sudo nft -f new.conf; sleep 60; sudo nft flush ruleset` and Ctrl-C if all is well.

## Why `ct state established,related`
web01 *initiates* connections (DNS to ns01, proxying to app01). The replies arrive as inbound packets to random high ports.
Without the conntrack rule, `policy drop` eats them.
