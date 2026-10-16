on app01 'pgrep -x "$PROC" >/dev/null' && fail "load is still pegged, something is still spinning at 100% CPU"
on app01 'systemctl is-active -q darkroom-api' || fail "the CPU is fine now but darkroom-api went down?!"
exit 0
