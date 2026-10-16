## Investigate
```bash
ssh app01
journalctl -u ingest -n 20               # OSError: [Errno 24] Too many open files
systemctl show ingest -p LimitNOFILE     # 1024
cat /proc/$(systemctl show -p MainPID --value ingest)/limits | grep 'open files'
```

## Fix
```bash
sudo systemctl edit ingest
#   [Service]
#   LimitNOFILE=4096
sudo systemctl restart ingest
```

## The trap
`ulimit -n` and `/etc/security/limits.conf` only affect **PAM login sessions**. systemd services get limits from the unit
(`LimitNOFILE=`) or `DefaultLimitNOFILE=` in `/etc/systemd/system.conf`. Check a live process with `/proc/<pid>/limits`
or `prlimit -p <pid>`.
