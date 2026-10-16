#!/bin/bash
# Point at the lab router and lab DNS instead of Docker's.
. /etc/lab.env 2>/dev/null
if [ -n "$LAB_GW" ]; then
  ip route replace default via "$LAB_GW" || true
fi
printf 'nameserver 10.10.3.53\nsearch darkroom.internal\n' > /etc/resolv.conf
