on app01 <<'X'
set -e
users=(jenny omar grace carlos hana tariq noah); f=/var/log/darkroom/auth.jsonl; : > $f
top=${users[$((RANDOM % 7))]}
busy=${users[$(( ( $(printf '%d' "'${top:0:1}") + 1) % 7 ))]}; [ "$busy" = "$top" ] && busy=${users[0]}
for i in $(seq 1 700); do
  r=$((RANDOM % 10))
  if [ $r -lt 2 ]; then u=$top; res=failure
  elif [ $r -lt 5 ]; then u=$busy; res=success
  else u=${users[$((RANDOM % 7))]}; [ $((RANDOM % 6)) -eq 0 ] && res=failure || res=success; fi
  printf '{"ts":"2026-10-16T%02d:%02d:%02dZ","user":"%s","result":"%s","ip":"10.10.%d.%d"}\n' $((RANDOM%24)) $((RANDOM%60)) $((RANDOM%60)) $u $res $((RANDOM%3+1)) $((RANDOM%250)) >> $f
done
echo TOP=$(jq -r 'select(.result=="failure") | .user' $f | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')
X
