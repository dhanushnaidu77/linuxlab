on app01 'pgrep -x "$PROC" >/dev/null' && fail "load is still pegged, something is still spinning at 100% CPU"
on app01 'systemctl is-active -q kestrel-api' || fail "the CPU is fine now but kestrel-api went down?!"
exit 0
