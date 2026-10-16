## Investigate
```bash
echo | openssl s_client -connect web01.darkroom.internal:443 -servername web01.darkroom.internal 2>/dev/null \
  | openssl x509 -noout -subject -dates           # notAfter=Feb  1 00:00:00 2025 GMT
ssh web01 'grep ssl_certificate /etc/nginx/sites-enabled/*'
```

## Fix
```bash
ssh web01
sudo openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -subj /CN=web01.darkroom.internal \
  -addext "subjectAltName=DNS:web01.darkroom.internal,DNS:www.darkroom.internal" \
  -keyout /etc/nginx/ssl/darkroom.key -out /etc/nginx/ssl/darkroom.crt
sudo nginx -t && sudo systemctl reload nginx
```

## Notes
- Modern browsers ignore CN and require **subjectAltName** — always add SANs.
- `openssl x509 -checkend 2592000` exits non-zero if the cert expires within 30 days — great for monitoring.
- In real life use an internal CA or ACME (certbot / step-ca) and monitor expiry.
