on jump01 "curl -fsS -m 3 http://web01.darkroom.internal/ | grep -q 'build $CODE'" || fail "the homepage still isn't the backed-up version"
on web01 'grep -q "keep!" /var/www/darkroom/about.html && grep -q "keep!" /var/www/darkroom/site.css' || fail "homepage is back, but about.html / site.css got reverted to old versions too 😬"
