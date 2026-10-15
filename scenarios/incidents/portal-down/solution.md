## Outside in
```bash
curl -v http://web01.kestrel.internal/          # connection refused → nothing listening on web01:80
ssh web01
systemctl status nginx                          # failed
sudo nginx -t                                   # "invalid number of arguments in "index" directive ... line 11"
sudoedit /etc/nginx/sites-available/kestrel     # add the missing ';'
sudo nginx -t && sudo systemctl start nginx
curl http://web01.kestrel.internal/api/health   # 502 → upstream (app01) is down
ssh app01 'systemctl status kestrel-api'        # inactive
ssh app01 'sudo systemctl start kestrel-api'
```

## Incident habits
- Post a status update early ("investigating, portal down, next update in 15m") — that's what the CTO wants.
- One fix can reveal the next fault; re-test end-to-end after each step.
- Always `nginx -t` before restart/reload — a reload with a bad config fails safely, a restart takes the site down.
