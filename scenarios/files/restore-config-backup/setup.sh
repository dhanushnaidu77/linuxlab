on app01 <<'X'
set -e
mkdir -p /var/backups/darkroom
good=/etc/darkroom/api.conf
cp $good /tmp/good.conf
sed 's/db01.darkroom.internal/db-old.darkroom.internal/' /tmp/good.conf > /var/backups/darkroom/api.conf.20260901.bak
sed 's/db01.darkroom.internal/db-old.darkroom.internal/' /tmp/good.conf > /var/backups/darkroom/api.conf.20260915.bak
cp /tmp/good.conf /var/backups/darkroom/api.conf.20261001.bak
touch -d '2026-09-01' /var/backups/darkroom/api.conf.20260901.bak
touch -d '2026-09-15' /var/backups/darkroom/api.conf.20260915.bak
touch -d '2026-10-01' /var/backups/darkroom/api.conf.20261001.bak
sed -i '/^\[server\]/,/^$/d' $good
systemctl restart darkroom-api || true
echo BAK=api.conf.20261001.bak
X
