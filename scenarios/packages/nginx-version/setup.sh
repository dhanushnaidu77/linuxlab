v=$(on web01 "dpkg-query -W -f='\${Version}' nginx")
echo "VER=$v"
echo "UP=${v%%-*}"
