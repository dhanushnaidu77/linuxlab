on app01 <<'X'
set -e
rm -rf /etc/darkroom/conf.d; mkdir -p /etc/darkroom/conf.d/{workers,jobs,api}
n=0
for f in workers/billing workers/mailer jobs/nightly jobs/cleanup api/main api/admin api/readonly workers/search; do
  if [ $((RANDOM % 3)) -ne 0 ]; then
    printf '[db]\nhost = db-legacy.darkroom.internal\nreplica = db-legacy-replica.darkroom.internal\ndsn = postgres://app@db-legacy.darkroom.internal:5432/darkroom?fallback=db-legacy.darkroom.internal\n' > /etc/darkroom/conf.d/$f.conf
    n=$((n+1))
  else
    printf '[db]\nhost = db01.darkroom.internal\nreplica = db-legacy-replica.darkroom.internal\n' > /etc/darkroom/conf.d/$f.conf
  fi
done
cp -a /etc/darkroom/conf.d /root/conf.d.orig
echo N=$n
X
