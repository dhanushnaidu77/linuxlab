## Fix
```bash
ssh app01
pgrep -x {{NAME}}          # exact process name → PID
pgrep -a {{NAME}}          # PID + full command line
```

## Other ways
- `ps -C {{NAME}} -o pid,user,etime,cmd`
- The bracket trick stops grep matching itself: `ps aux | grep '[q]ueue-worker'`
- `pidof {{NAME}}`
