on app01 <<'X'
set -e
mkdir -p /var/backups/kestrel
good=/etc/kestrel/api.conf
cp $good /tmp/good.conf
sed 's/db01.kestrel.internal/db-old.kestrel.internal/' /tmp/good.conf > /var/backups/kestrel/api.conf.20260901.bak
sed 's/db01.kestrel.internal/db-old.kestrel.internal/' /tmp/good.conf > /var/backups/kestrel/api.conf.20260915.bak
cp /tmp/good.conf /var/backups/kestrel/api.conf.20261001.bak
touch -d '2026-09-01' /var/backups/kestrel/api.conf.20260901.bak
touch -d '2026-09-15' /var/backups/kestrel/api.conf.20260915.bak
touch -d '2026-10-01' /var/backups/kestrel/api.conf.20261001.bak
sed -i '/^\[server\]/,/^$/d' $good
systemctl restart kestrel-api || true
echo BAK=api.conf.20261001.bak
X
