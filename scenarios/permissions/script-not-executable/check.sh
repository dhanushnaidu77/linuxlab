as_user app01 kestrel '/opt/kestrel/nightly-report.sh' >/dev/null 2>&1 || fail "still getting Permission denied when the kestrel user runs it"
on app01 'p=$(stat -c %a /opt/kestrel/nightly-report.sh); [ $((0$p & 2)) -eq 0 ]' || fail "it runs now but sam from security says the script is world-writable 😬"
