echo "ANSWER=$(on jump01 'find / -xdev -perm -4000 -type f 2>/dev/null | while read f; do dpkg -S "$f" >/dev/null 2>&1 || dpkg -S "${f#/usr}" >/dev/null 2>&1 || echo "$f"; done')"
