on ns01 'named-checkzone darkroom.internal /etc/bind/db.darkroom.internal >/dev/null' || fail "named-checkzone fails on the zone file now 😬"
got=$(on jump01 "dig +short $NAME.darkroom.internal @10.10.3.53")
[ "$got" = "$IP" ] || fail "dig $NAME.darkroom.internal @ns01 returns '${got:-nothing}', expected $IP"
on ns01 'new=$(dig +short SOA darkroom.internal @127.0.0.1 | awk "{print \$3}"); [ "$new" -gt "$(cat /root/serial.orig)" ]' || fail "the SOA serial wasn't bumped — secondaries won't pick up the change"
