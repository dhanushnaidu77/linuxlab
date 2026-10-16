on app01 <<'X'
id auditor >/dev/null 2>&1 || useradd -m auditor
setfacl -R -b /var/log/darkroom 2>/dev/null
chown -R darkroom:darkroom /var/log/darkroom; chmod 750 /var/log/darkroom
echo "$(date -Is) INFO boot" >> /var/log/darkroom/api.log; chmod 640 /var/log/darkroom/*
X
