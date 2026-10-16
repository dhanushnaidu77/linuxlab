ok=$(on jump01 "python3 -W ignore -c 'import crypt,sys; h=sys.argv[1]; print(int(crypt.crypt(\"Welcome-Temp-2026\", h) == h))' \"\$(getent shadow $USER | cut -d: -f2)\"")
[ "$ok" = 1 ] || fail "the temporary password isn't Welcome-Temp-2026"
on jump01 "[ -z \"\$(getent shadow $USER | cut -d: -f8)\" ]" || fail "password's reset but the ACCOUNT itself is still expired — they still can't get in"
on jump01 "[ \"\$(getent shadow $USER | cut -d: -f3)\" = 0 ]" || fail "they log in fine but aren't forced to change the temp password"
