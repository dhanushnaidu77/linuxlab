## Investigate
```bash
ping app01                  # timeout from jump01 (10.10.1.0/24)
ssh db01                    # db01 is on app01's subnet
ping 10.10.3.10             # works: same L2 segment, no router needed
ssh app01                   # (or from jump01: ssh -J db01 app01)
ip route                    # only "10.10.3.0/24 dev eth0 ..." — no default!
```

## Fix
```bash
sudo ip route add default via 10.10.3.1
ip route get 10.10.1.10     # "via 10.10.3.1 dev eth0" — the reply path exists again
```

## Notes
- Asymmetric failure: packets *reach* app01 (rtr01 routes them), but app01 can't *reply*. `tcpdump -i eth0 icmp` on app01 shows
  requests arriving with no replies leaving.
- `ip route` changes are not persistent. On real Ubuntu servers the default route comes from netplan (`/etc/netplan/*.yaml`,
  then `netplan apply`); in this lab it's set by `lab-net.service` at boot.
- `ssh -J host1 host2` (ProxyJump) is the cleanest way to hop through a bastion.
