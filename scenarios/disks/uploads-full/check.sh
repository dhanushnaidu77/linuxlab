on app01 '[ $(ls /srv/uploads/customer-docs 2>/dev/null | wc -l) -eq 20 ]' || fail "[FIRING] DataLoss — customer-docs files are missing!! (were 20)"
on app01 '[ $(df --output=pcent /srv/uploads | tail -1 | tr -dc 0-9) -lt 50 ]' || fail "[FIRING] DiskAlmostFull — app01:/srv/uploads still $(on app01 "df --output=pcent /srv/uploads | tail -1 | tr -d ' '") used"
