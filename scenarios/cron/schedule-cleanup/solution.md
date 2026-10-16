## Fix
```bash
ssh app01
sudo crontab -u darkroom -e
#   */15 * * * * /opt/darkroom/cleanup-tmp.sh
sudo crontab -u darkroom -l
```

## Cron cheat sheet
```
# m    h   dom mon dow
*/15   *   *   *   *     every 15 min
0      2   *   *   1-5   02:00 on weekdays
30     */6 *   *   *     every 6 hours at :30
```
- User crontabs (`crontab -e`) have **no** user column; `/etc/cron.d/*` files **do**.
- Cron has a minimal PATH and no TTY — use absolute paths and redirect output to a log.
- https://crontab.guru is handy for checking expressions.
