echo "ANSWER=$(on app01 "ss -ltnpH 'sport = :$PORT' | grep -o 'users:((\"[^\"]*' | cut -d'\"' -f2")"
