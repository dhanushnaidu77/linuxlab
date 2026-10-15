## Investigate
```bash
curl -v http://web01/api/health          # 504 from nginx: it can't reach the upstream
ssh web01 'nc -zv -w2 app01 8080'        # times out from the DMZ
ssh rtr01 'sudo nft list ruleset'        # forward chain: ... tcp dport 8080 drop
ssh rtr01 'sudo nft list ruleset -a'     # -a shows rule handles
```

## Fix (persistent)
```bash
ssh rtr01
sudoedit /etc/nftables.conf              # remove the 'tcp dport 8080 drop' line
sudo nft -c -f /etc/nftables.conf        # -c = check only
sudo systemctl reload nftables           # or: sudo nft -f /etc/nftables.conf
```

## Quick live-only fix (not enough on its own)
`sudo nft delete rule inet filter forward handle <N>` — gone after a reboot unless the file is fixed too.

## Notes
Firewall rules for routed traffic live in the **forward** chain (on the router); rules for traffic *to the box itself* in **input**.
