on app01 <<'X'
for g in devs builders oncall deployers; do getent group $g >/dev/null || groupadd $g; done
id $USER >/dev/null 2>&1 || useradd -m -s /bin/bash $USER
usermod -G devs,builders,oncall $USER
mkdir -p /srv/deploy; echo "release manifest" > /srv/deploy/manifest.txt
chgrp -R deployers /srv/deploy; chmod 2750 /srv/deploy; chmod 640 /srv/deploy/manifest.txt
X
