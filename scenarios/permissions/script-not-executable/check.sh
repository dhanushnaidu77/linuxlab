as_user app01 darkroom '/opt/darkroom/nightly-report.sh' >/dev/null 2>&1 || fail "still getting Permission denied when the darkroom user runs it"
on app01 'p=$(stat -c %a /opt/darkroom/nightly-report.sh); [ $((0$p & 2)) -eq 0 ]' || fail "it runs now but sam from security says the script is world-writable 😬"
