got=$(on app01 'dig +short db01.kestrel.internal')
[ "$got" = 10.10.3.20 ] || fail "db01.kestrel.internal resolves to ${got:-nothing} from app01"
on app01 'curl -fsS -m 4 localhost:8080/health | grep -q "\"db\": \"up\""' || fail "health still says db: down"
