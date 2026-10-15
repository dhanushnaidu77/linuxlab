on app01 <<'X'
set -e
mkdir -p /srv/data; f=/srv/data/sales.csv
echo "date,region,product,units,revenue" > $f
regions=(EMEA APAC NA LATAM); products=(widget gizmo sprocket gadget)
for i in $(seq 1 600); do
  u=$((RANDOM%50+1))
  echo "2026-$(printf %02d $((RANDOM%9+1)))-$(printf %02d $((RANDOM%28+1))),${regions[$((RANDOM%4))]},${products[$((RANDOM%4))]},$u,$((u*(RANDOM%90+10)))" >> $f
done
echo TOTAL=$(awk -F, -v r="$REGION" '$2==r {s+=$5} END {print s}' $f)
X
