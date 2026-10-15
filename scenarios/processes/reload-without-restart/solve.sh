on app01 "sed -i \"s/^rate=.*/rate=\$RATE/\" /etc/kestrel/feeder.conf && pkill -HUP -f '[f]eeder.py' && sleep 0.5"
