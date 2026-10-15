on app01 <<'X'
getent group finance >/dev/null || groupadd finance
for u in $U1 $U2 carlos; do id $u >/dev/null 2>&1 || useradd -m -s /bin/bash $u; done
usermod -aG finance $U1; usermod -aG finance $U2
rm -rf /srv/shared/finance; mkdir -p /srv/shared; chmod 755 /srv/shared
# users get a group-writable umask so shared editing can work
grep -q 'umask 002' /etc/profile.d/kestrel-umask.sh 2>/dev/null || echo 'umask 002' > /etc/profile.d/kestrel-umask.sh
X
