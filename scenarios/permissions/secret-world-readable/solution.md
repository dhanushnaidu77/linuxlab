## Fix
```bash
ssh app01
ls -l /etc/darkroom/db.secret                  # -rw-r--r-- root root
sudo chown root:darkroom /etc/darkroom/db.secret
sudo chmod 640 /etc/darkroom/db.secret         # -rw-r----- root darkroom
sudo -u darkroom cat /etc/darkroom/db.secret    # service can read
sudo -u carlos cat /etc/darkroom/db.secret     # Permission denied
```

## Notes
`chmod 600` would also hide it from others — and from the service, breaking the app. Least privilege means
*exactly* the access needed: here, group read for the service account.
