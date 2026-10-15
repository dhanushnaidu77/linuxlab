## Find it
```bash
nmap -sn 10.10.2.0/24          # ping sweep of the dmz subnet → {{NEWIP}} is up, .10 isn't
ssh {{NEWIP}}
ip -br addr                    # eth0 UP {{NEWIP}}/24
```

## Fix
Do it as **one** command — your ssh session rides on {{NEWIP}} and will drop the moment that address goes away:
```bash
sudo sh -c 'ip addr flush dev eth0 && ip addr add 10.10.2.10/24 dev eth0 && ip route replace default via 10.10.2.1'
# session hangs → close it (Enter ~ .) and reconnect:
ssh web01 'ip -br addr; ip route'
```

## The gotcha
"Add the new address, then delete the old one" doesn't work here: the address added second on the same subnet is a
**secondary**, and deleting the **primary** also deletes its secondaries (unless the sysctl
`net.ipv4.conf.<if>.promote_secondaries=1`). You'd end up with no address at all. Flushing the interface routes too,
hence re-adding the default route in the same command.

## Notes
- `ip -br addr` / `ip -br link` are the quickest overview.
- `arping`/`ip neigh` show L2 neighbours; useful when ICMP is filtered.
- Persistent config on Ubuntu lives in netplan, not in `ip` commands.
