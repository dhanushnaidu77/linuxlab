on app01 <<'X'
set -e
mountpoint -q /srv/uploads && umount /srv/uploads
mkdir -p /srv/uploads && mount -t tmpfs -o size=64M tmpfs /srv/uploads
mkdir -p /srv/uploads/customer-docs /srv/uploads/.$JUNK
for i in $(seq 1 20); do head -c 100K /dev/urandom > /srv/uploads/customer-docs/contract-$i.pdf; done
for i in $(seq 1 11); do head -c 5M /dev/zero > /srv/uploads/.$JUNK/chunk-$i.tmp; done
X
