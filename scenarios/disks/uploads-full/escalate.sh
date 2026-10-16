# live mode: the junk keeps growing while the ticket is open
on app01 'for i in 12 13; do head -c 3M /dev/zero > /srv/uploads/.$JUNK/chunk-$i.tmp 2>/dev/null || true; done'
