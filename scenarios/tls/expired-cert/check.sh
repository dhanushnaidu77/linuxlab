cert=$(on jump01 'echo | openssl s_client -connect web01.kestrel.internal:443 -servername web01.kestrel.internal 2>/dev/null | openssl x509 2>/dev/null')
[ -n "$cert" ] || fail "https on web01 doesn't even answer now"
echo "$cert" | openssl x509 -noout -checkend 2592000 >/dev/null || fail "browser still says the certificate is expired (or expires within 30 days)"
echo "$cert" | openssl x509 -noout -subject | grep -q 'web01.kestrel.internal' || fail "certificate name doesn't match web01.kestrel.internal"
on web01 'systemctl is-active -q nginx' || fail "the portal is down completely now"
