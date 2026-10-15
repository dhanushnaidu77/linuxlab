on jump01 'printf "# managed by netops\nnameserver %s\noptions timeout:1 attempts:1\n" "$BAD" > /etc/resolv.conf'
