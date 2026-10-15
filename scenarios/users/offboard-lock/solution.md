## What was tricky
`passwd -l` / `usermod -L` only puts a `!` in front of the password hash. **SSH public-key logins don't use the password**,
so the user could still get in.

## Fix
```bash
sudo usermod -L -e 1 {{USER}}        # lock password + expire account (1 = Jan 2 1970)
sudo passwd -S {{USER}}              # shows L (locked)
sudo chage -l {{USER}}               # Account expires: Jan 02, 1970
ssh {{USER}}@localhost               # verify: denied
```

## Other ways
- `sudo usermod -s /usr/sbin/nologin {{USER}}` — blocks interactive shells (but not e.g. SFTP/port forwarding in every setup)
- Move away their keys: `sudo mv ~{{USER}}/.ssh/authorized_keys{,.disabled}`
- Also check for running sessions/cron: `who`, `ps -u {{USER}}`, `crontab -l -u {{USER}}`
