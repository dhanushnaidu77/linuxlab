## Fix
```bash
ssh app01
ls -l /etc/kestrel/db.secret                  # -rw-r--r-- root root
sudo chown root:kestrel /etc/kestrel/db.secret
sudo chmod 640 /etc/kestrel/db.secret         # -rw-r----- root kestrel
sudo -u kestrel cat /etc/kestrel/db.secret    # service can read
sudo -u carlos cat /etc/kestrel/db.secret     # Permission denied
```

## Notes
`chmod 600` would also hide it from others — and from the service, breaking the app. Least privilege means
*exactly* the access needed: here, group read for the service account.
