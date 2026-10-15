on db01 <<'X'
set -e
rm -rf /srv/archive; mkdir -p /srv/archive
months=(2025-01 2025-02 2025-03 2025-04 2025-05 2025-06 2025-07 2025-08 2025-09 2025-10)
big=${months[$((RANDOM%10))]}
for m in "${months[@]}"; do
  mkdir /srv/archive/$m
  if [ $m = $big ]; then n=8; sz=400; else n=$((RANDOM%20+20)); sz=$((RANDOM%40+20)); fi
  for i in $(seq 1 $n); do head -c ${sz}K /dev/urandom > /srv/archive/$m/dump-$i.sql.gz; done
done
echo BIG=$big
X
