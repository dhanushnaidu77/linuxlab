on app01 "sed -i \"s/^rate=.*/rate=\$RATE/\" /etc/darkroom/feeder.conf && pkill -HUP -f '[f]eeder.py' && sleep 0.5"
