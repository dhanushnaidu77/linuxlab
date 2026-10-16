on jump01 <<'X'
id $USER >/dev/null 2>&1 || useradd -m -s /bin/bash $USER
echo "$USER:OldPass-2025" | chpasswd
chage -d 2025-01-01 -M 90 -E 2026-01-01 $USER
X
