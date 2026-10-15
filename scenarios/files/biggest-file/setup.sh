on app01 <<'X'
set -e
rm -rf /srv/exports && mkdir -p /srv/exports
names=(orders customers refunds invoices payouts ledger inventory shipments returns coupons tax audit)
max=0; big=
for n in "${names[@]}"; do
  kb=$(( (RANDOM % 900) + 50 ))
  f=/srv/exports/export-$n-$(date +%Y%m%d).csv
  head -c $((kb*1024)) /dev/urandom | base64 > "$f"
  s=$(stat -c %s "$f"); if [ "$s" -gt "$max" ]; then max=$s; big=$(basename "$f"); fi
done
echo "BIG=$big"
X
