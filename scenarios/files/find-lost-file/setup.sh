on app01 <<'X'
set -e
rm -rf /srv/share && mkdir -p /srv/share
for dept in accounting sales hr ops legal; do
  for y in 2024 2025 2026; do
    for q in q1 q2 q3 q4; do
      mkdir -p /srv/share/$dept/$y/$q/drafts
      for i in 1 2 3; do echo "decoy" > /srv/share/$dept/$y/$q/drafts/notes-$i.txt; done
      echo decoy > /srv/share/$dept/$y/$q/$q-budget-old.xlsx
    done
  done
done
depts=(sales hr ops legal); d=${depts[$RANDOM % 4]}
target=/srv/share/$d/2025/q$((RANDOM%4+1))/drafts/q3-budget-$WORD.xlsx
echo "spreadsheet" > "$target"; chown -R 1000:1000 /srv/share
echo "FILEPATH=$target"
X
