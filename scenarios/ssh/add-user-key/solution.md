## Fix
```bash
# on jump01
cat ~/inbox/{{USER}}.pub | ssh app01 \
  'sudo install -d -m 700 -o {{USER}} -g {{USER}} ~{{USER}}/.ssh &&
   sudo tee -a ~{{USER}}/.ssh/authorized_keys >/dev/null &&
   sudo chown {{USER}}: ~{{USER}}/.ssh/authorized_keys &&
   sudo chmod 600 ~{{USER}}/.ssh/authorized_keys'
```

## Notes
- `ssh-copy-id` does this for *your own* account; for someone else's you need sudo on the target.
- Verify a key file before installing it: `ssh-keygen -lf {{USER}}.pub` prints its fingerprint — compare it with the
  one the developer gives you over a different channel.
- Never accept a *private* key from a user, and never generate keys on their behalf if you can avoid it.
