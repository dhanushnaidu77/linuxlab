on jump01 'getent hosts web01.kestrel.internal >/dev/null' || fail "jump01 still can't resolve web01.kestrel.internal"
on jump01 'getent hosts web01 >/dev/null' || fail "full names work now, but the short name 'web01' still doesn't resolve"
