on app01 <<'X'
set -e
cd /var/log/kestrel; rm -f api.log.*
gen() { for i in $(seq 1 300); do echo "2026-10-$1 $(printf '%02d:%02d:%02d' $((RANDOM%24)) $((RANDOM%60)) $((RANDOM%60))) INFO GET /health 200 req=$(printf '%06x' $((RANDOM*RANDOM%16777215)))"; done; }
req=exp-$(printf '%06x' $((RANDOM*RANDOM%16777215)))
gen 15 > api.log; gen 14 > api.log.1
{ gen 13; echo "2026-10-13 02:31:07 ERROR export job failed: vendor rejected payload req=$req"; gen 13; } > api.log.2
gen 12 > api.log.3
for i in 1 2 3; do echo "2026-10-1$i 02:30:00 INFO export job finished ok req=exp-$(printf '%06x' $((RANDOM*RANDOM%16777215)))" >> api.log.$i 2>/dev/null || true; done
gzip -f api.log.2 api.log.3
chown kestrel:kestrel api.log*
echo REQ=$req
X
