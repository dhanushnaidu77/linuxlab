## Investigate
```bash
ssh app01
curl localhost:8080/health             # "db": "down"
grep host /etc/kestrel/api.conf        # db01.kestrel.internal  ← by name
dig +short db01.kestrel.internal       # {{WRONG}}  ✗ (real: 10.10.3.20)
dig +short -x 10.10.3.20               # reverse DNS still says db01
```

## Fix
```bash
ssh ns01
sudoedit /etc/bind/db.kestrel.internal  # db01 IN A 10.10.3.20, bump serial
sudo named-checkzone kestrel.internal /etc/bind/db.kestrel.internal && sudo rndc reload
```

## Notes
"Works by IP, fails by name" is almost always DNS (or `/etc/hosts`). `getent hosts <name>` shows what the *system* resolver
returns, including /etc/hosts — `dig` only asks DNS.
