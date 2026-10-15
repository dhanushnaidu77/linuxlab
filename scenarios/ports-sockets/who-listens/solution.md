## Fix
```bash
ssh app01
sudo ss -ltnp | grep :{{PORT}}
# LISTEN 0 5 0.0.0.0:{{PORT}} 0.0.0.0:* users:(("{{PROC}}",pid=1234,fd=3))
ps -o pid,user,lstart,cmd -p 1234        # who started it, when, full command
```

## Other ways
- `sudo lsof -iTCP:{{PORT}} -sTCP:LISTEN`
- `sudo fuser -v {{PORT}}/tcp`
- From another host: `nmap -p {{PORT}} app01` / `nc -zv app01 {{PORT}}` (tells you it's open, not what it is)

Without `sudo`, `ss -p` only shows processes you own.
