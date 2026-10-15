on jump01 'curl -fsS -m 4 http://web01.kestrel.internal/api/health >/dev/null' || fail "still getting 504s on /api/ through web01"
on web01 'nc -z -w 2 10.10.3.20 5432' && fail "the API works but now the DMZ can reach postgres on db01 again — the CHG-2291 block is gone"
on rtr01 'nft -c -f /etc/nftables.conf' >/dev/null 2>&1 || fail "/etc/nftables.conf doesn't even parse — it would fail at boot"
on rtr01 'grep -v "^\s*#" /etc/nftables.conf | grep -q "dport 8080 drop"' && fail "live rules are fine, but /etc/nftables.conf still has the 8080 drop — it'll break again on reboot"
on rtr01 'grep -v "^\s*#" /etc/nftables.conf | grep -q "dport 5432 drop"' || fail "/etc/nftables.conf lost the 5432 block — after a reboot the DMZ reaches postgres"
exit 0
