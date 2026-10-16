on web01 <<'X'
set -e
mkdir -p /var/backups/web /tmp/snap/var/www/darkroom
cat > /tmp/snap/var/www/darkroom/index.html <<H
<!doctype html><title>Darkroom Labs</title><h1>Darkroom Labs internal portal</h1><p>status: ok</p><!-- build $CODE -->
H
echo "old about page" > /tmp/snap/var/www/darkroom/about.html
echo "old css" > /tmp/snap/var/www/darkroom/site.css
tar czf /var/backups/web/site-2026-10-01.tar.gz -C /tmp/snap var/www/darkroom
rm -rf /tmp/snap
echo "new about page (keep!)" > /var/www/darkroom/about.html
echo "new css (keep!)" > /var/www/darkroom/site.css
echo "test test" > /var/www/darkroom/index.html
X
