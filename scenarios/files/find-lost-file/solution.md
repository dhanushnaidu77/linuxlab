## Fix
Search the tree by name:
```bash
ssh app01
find /srv -name 'q3-budget-*'      # note: also matches old decoy files — use the exact name
```
`find <start> -name '<glob>'` walks every directory below the start point. Quote the glob so your shell doesn't expand it.

## Other ways
- `find /srv -iname '*budget*' -newermt '2025-01-01'` — case-insensitive, filtered by date
- `locate` is faster but needs an up-to-date `updatedb` index (often stale on servers)
- `find /srv -type f -mmin -60` — "what changed in the last hour?" is a great habit
