on web01 <<'X'
set -e
cp /etc/nginx/ssl/darkroom.crt /root/darkroom.crt.orig; cp /etc/nginx/ssl/darkroom.key /root/darkroom.key.orig
ca=$(mktemp -d); cd $ca
touch index.txt; echo 01 > serial
cat > ca.cnf <<'C'
[ ca ]
default_ca = d
[ d ]
dir = .
database = ./index.txt
new_certs_dir = .
serial = ./serial
default_md = sha256
policy = p
[ p ]
commonName = supplied
C
openssl req -new -newkey rsa:2048 -nodes -subj /CN=web01.darkroom.internal -keyout /etc/nginx/ssl/darkroom.key -out req.csr 2>/dev/null
openssl ca -batch -selfsign -config ca.cnf -keyfile /etc/nginx/ssl/darkroom.key -in req.csr -out /etc/nginx/ssl/darkroom.crt \
  -startdate 20250101000000Z -enddate 20250201000000Z -notext 2>/dev/null
cd /; rm -rf $ca
systemctl reload nginx; sleep 1
X
