left=$(on app01 "grep -rho 'db-legacy\.darkroom\.internal' /etc/darkroom/conf.d | wc -l")
[ "$left" -eq 0 ] || fail "still $left mentions of db-legacy.darkroom.internal under conf.d"
on app01 '[ $(grep -rho "db-legacy-replica\.darkroom\.internal" /etc/darkroom/conf.d | wc -l) -eq 8 ]' || fail "the db-legacy-replica entries got changed too — those are a different host!"
on app01 'diff -r <(cd /root/conf.d.orig && grep -r . | sed "s/db-legacy\.darkroom\.internal/db01.darkroom.internal/g" | sort) <(cd /etc/darkroom/conf.d && grep -r . | sort) >/dev/null' || fail "something else in the files changed besides the hostname"
