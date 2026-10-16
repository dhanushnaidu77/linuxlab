on web01 <<'X'
set -e
# age everything so only our file looks recent
find /etc -xdev -newermt '-2 hours' -exec touch -h -d '-3 days' {} + 2>/dev/null || true
files=(/etc/nginx/nginx.conf /etc/ssh/sshd_config /etc/logrotate.d/nginx /etc/security/limits.conf /etc/sysctl.conf /etc/nginx/mime.types)
f=${files[$((RANDOM % ${#files[@]}))]}
echo "# tuning $(date +%s)" >> "$f"
touch -d '-20 minutes' "$f"
echo "CHANGED=$f"
X
