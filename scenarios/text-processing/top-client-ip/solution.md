## Fix
```bash
ssh web01
awk '{print $1}' /var/log/nginx/darkroom.access.log | sort | uniq -c | sort -rn | head
```
- `awk '{print $1}'` — first whitespace-separated field (client IP in nginx's combined format)
- `sort | uniq -c` — `uniq` only collapses *adjacent* duplicates, so sort first
- `sort -rn` — numeric, descending

## Variations
- Top URLs: `awk '{print $7}' ... | sort | uniq -c | sort -rn | head`
- Only errors: `awk '$9 >= 500 {print $1}' ...`
- Live: `tail -f access.log | awk '{print $1}'`
