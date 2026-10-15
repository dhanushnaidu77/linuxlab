on ns01 <<'X'
f=/etc/bind/db.kestrel.internal
old=$(cat /root/serial.orig)
sed -i "s/$old/$((old+1))/" $f
echo "$NAME IN A $IP" >> $f
named-checkzone kestrel.internal $f >/dev/null && rndc reload >/dev/null
X
