on ns01 'named-checkzone kestrel.internal /etc/bind/db.kestrel.internal >/dev/null' || fail "named-checkzone fails on the zone file now 😬"
got=$(on jump01 "dig +short $NAME.kestrel.internal @10.10.3.53")
[ "$got" = "$IP" ] || fail "dig $NAME.kestrel.internal @ns01 returns '${got:-nothing}', expected $IP"
on ns01 'new=$(dig +short SOA kestrel.internal @127.0.0.1 | awk "{print \$3}"); [ "$new" -gt "$(cat /root/serial.orig)" ]' || fail "the SOA serial wasn't bumped — secondaries won't pick up the change"
