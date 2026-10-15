on app01 <<'X'
set -e
f=/var/log/kestrel/api.log; : > $f
n=0
for i in $(seq 1 400); do
  ts="2026-10-15 $(printf '%02d:%02d:%02d' $((i/60%24)) $((i%60)) $((RANDOM%60))),$((RANDOM%1000))"
  r=$((RANDOM%10))
  if [ $r -eq 0 ]; then echo "$ts ERROR request failed: upstream timeout (req=$RANDOM)" >> $f; n=$((n+1))
  elif [ $r -eq 1 ]; then echo "$ts WARN slow query took $((RANDOM%3000))ms" >> $f
  elif [ $r -eq 2 ]; then echo "$ts INFO retrying after error, attempt 2" >> $f
  else echo "$ts INFO GET /health 200" >> $f; fi
done
chown kestrel:kestrel $f
echo COUNT=$n
X
