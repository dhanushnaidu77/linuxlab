## Investigate
```bash
ssh app01
curl localhost:8080/health             # "db": "down"
grep host /etc/darkroom/api.conf        # db01.darkroom.internal  ← by name
dig +short db01.darkroom.internal       # {{WRONG}}  ✗ (real: 10.10.3.20)
dig +short -x 10.10.3.20               # reverse DNS still says db01
```

## Fix
```bash
ssh ns01
sudoedit /etc/bind/db.darkroom.internal  # db01 IN A 10.10.3.20, bump serial
sudo named-checkzone darkroom.internal /etc/bind/db.darkroom.internal && sudo rndc reload
```

## Notes
"Works by IP, fails by name" is almost always DNS (or `/etc/hosts`). `getent hosts <name>` shows what the *system* resolver
returns, including /etc/hosts — `dig` only asks DNS.
