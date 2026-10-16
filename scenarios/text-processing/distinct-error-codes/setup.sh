on app01 <<'X'
set -e
f=/var/log/darkroom/worker.log; : > $f
k=$((RANDOM % 9 + 6)); codes=(); for i in $(seq $k); do codes+=("E$((RANDOM % 9000 + 1000))"); done
for i in $(seq 1 500); do
  c=${codes[$((RANDOM % k))]}
  case $((RANDOM % 4)) in
    0) echo "2026-10-16 10:$((RANDOM%60)) ERROR job failed code=$c retry=1" ;;
    1) echo "2026-10-16 11:$((RANDOM%60)) ERROR [$c] upstream timeout" ;;
    2) echo "2026-10-16 12:$((RANDOM%60)) WARN slow job id=$RANDOM" ;;
    3) echo "2026-10-16 13:$((RANDOM%60)) ERROR code=$c while processing batch $RANDOM" ;;
  esac >> $f
done
echo N=$(grep -oE 'E[0-9]{4}' $f | sort -u | wc -l)
X
