on app01 "[ \"\$(pgrep -f '[p]ython3 /opt/darkroom/feeder.py')\" = \"\$(cat /root/.feeder.pid)\" ]" || fail "the feeder's PID changed (or it's not running) — it was restarted and dropped every open connection 😡"
on app01 'grep -qx "rate=$RATE" /etc/darkroom/feeder.conf' || fail "the config file still doesn't say rate=$RATE"
on app01 'grep -qx "active_rate=$RATE" /run/feeder.state' || fail "the feeder is still running at the old rate, it hasn't picked up the new config"
