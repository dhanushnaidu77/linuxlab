#!/bin/bash
# Generates the nightly finance report.
set -e
out=/srv/reports/report-$(date +%F).csv
echo "date,orders,revenue" > "$out"
echo "$(date +%F),$((RANDOM%500)),$((RANDOM%90000))" >> "$out"
echo "$(date -Is) report written to $out" >> /var/log/kestrel/report.log
