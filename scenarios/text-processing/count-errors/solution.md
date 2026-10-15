## Fix
```bash
ssh app01
grep -c ' ERROR ' /var/log/kestrel/api.log
```
`grep -c` counts matching **lines**. Matching `' ERROR '` (with spaces, uppercase) avoids counting INFO lines
like "retrying after error".

## Other ways
- `awk '$3 == "ERROR"' api.log | wc -l` — match on the exact field
- `grep -cw ERROR` — `-w` matches whole words; `-i` would wrongly include the lowercase ones
- Breakdown by level: `awk '{print $3}' api.log | sort | uniq -c`
