echo "ANSWER=$(on jump01 'dpkg -S "$BIN" 2>/dev/null || dpkg -S "${BIN#/usr}"' | head -1 | cut -d: -f1)"
