## Fix
```bash
ssh app01
head -2 /var/log/darkroom/auth.jsonl | jq .                    # look at the shape first
jq -r 'select(.result=="failure") | .user' /var/log/darkroom/auth.jsonl | sort | uniq -c | sort -rn | head
```

## jq in one breath
- `.field` access · `select(cond)` filter · `-r` raw strings (no quotes) · `-c` compact output
- Group in jq itself: `jq -s 'map(select(.result=="failure")) | group_by(.user) | map({user: .[0].user, n: length}) | sort_by(-.n)'`
- Counting *all* lines per user would have pointed at the busiest user, not the one failing most.
