## Fix
```bash
ssh app01
grep -oE 'E[0-9]{4}' /var/log/darkroom/worker.log | sort -u | wc -l       # distinct codes
grep -oE 'E[0-9]{4}' /var/log/darkroom/worker.log | sort | uniq -c | sort -rn   # with counts — more useful for triage
```
- `-o` prints only the matched text, one per line — the trick that makes this easy when codes appear in different positions.
- `-E` extended regex so `{4}` works without backslashes.
- `sort -u` ≡ `sort | uniq`.
