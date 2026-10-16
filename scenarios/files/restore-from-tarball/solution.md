## Fix
```bash
ssh web01
tar tzf /var/backups/web/site-2026-10-01.tar.gz            # list: var/www/darkroom/index.html (no leading /)
sudo tar xzf /var/backups/web/site-2026-10-01.tar.gz -C / var/www/darkroom/index.html
```

## Safer variant
Extract to a scratch dir first and compare:
```bash
mkdir /tmp/r && tar xzf backup.tar.gz -C /tmp/r var/www/darkroom/index.html
diff /tmp/r/var/www/darkroom/index.html /var/www/darkroom/index.html
```
- `t` list · `x` extract · `c` create · `z` gzip · `f` file · `-C dir` change directory first.
- tar strips the leading `/` when creating archives, so members are relative — hence `-C /`.
