## Investigate
```bash
cat /etc/resolv.conf               # nameserver {{BAD}}, no search line
dig web01.kestrel.internal         # ;; connection timed out; no servers could be reached
dig @10.10.3.53 web01.kestrel.internal   # works → the DNS server is fine, the client config isn't
```

## Fix
```bash
printf 'nameserver 10.10.3.53\nsearch kestrel.internal\n' | sudo tee /etc/resolv.conf
getent hosts web01
```

## Notes
- `search kestrel.internal` is what makes `web01` expand to `web01.kestrel.internal`.
- On a stock Ubuntu server `/etc/resolv.conf` is a symlink managed by systemd-resolved (`resolvectl status`) and netplan;
  editing it directly gets overwritten. In this lab it's a plain file.
- Resolution order (files vs dns) is set in `/etc/nsswitch.conf`.
