on app01 'nc -z -w 3 10.10.3.20 5432' || fail "[FIRING] KestrelApiDbDown — app01 → db01:5432 connection fails"
on app01 'curl -fsS -m 4 localhost:8080/health | grep -q "\"db\": \"up\""' || fail "[FIRING] KestrelApiDbDown — health still reports db: down"
on app01 'PGPASSWORD=kestrel-lab psql -h db01 -U kestrel -d kestrel -tAc "select 1"' >/dev/null 2>&1 || fail "[FIRING] KestrelApiDbDown — port open but postgres login from app01 fails"
