## Fix
```bash
ssh app01
head -3 /srv/data/sales.csv                       # always look at the header first
awk -F, '$2=="{{REGION}}" {s+=$5} END {print s}' /srv/data/sales.csv
```
- `-F,` sets the field separator to a comma
- the pattern `$2=="{{REGION}}"` filters rows (the header never matches, so it's skipped automatically)
- `END {print s}` runs once after the last line

## Other ways
- Group all regions at once: `awk -F, 'NR>1 {s[$2]+=$5} END {for (r in s) print r, s[r]}' sales.csv`
- `csvkit`/`mlr` handle quoted CSV properly — awk breaks on fields that contain commas inside quotes.
