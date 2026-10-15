on app01 <<'X'
set -e
dpkg -P kestrel-cli kestrel-common >/dev/null 2>&1 || true
rm -rf /tmp/pkgbuild /var/cache/kestrel; mkdir -p /tmp/pkgbuild /var/cache/kestrel
b=/tmp/pkgbuild/common; mkdir -p $b/DEBIAN $b/usr/share/kestrel
printf 'Package: kestrel-common\nVersion: %s\nArchitecture: all\nMaintainer: platform@kestrel.internal\nDescription: Kestrel shared files\n' "$VER" > $b/DEBIAN/control
echo "endpoint=http://app01.kestrel.internal:8080" > $b/usr/share/kestrel/defaults.conf
dpkg-deb --build -Zgzip $b /var/cache/kestrel/kestrel-common_${VER}_all.deb >/dev/null
b=/tmp/pkgbuild/cli; mkdir -p $b/DEBIAN $b/usr/bin
printf 'Package: kestrel-cli\nVersion: %s\nArchitecture: all\nDepends: kestrel-common (>= %s)\nMaintainer: platform@kestrel.internal\nDescription: Kestrel command line tool\n' "$VER" "$VER" > $b/DEBIAN/control
printf '#!/bin/bash\n[ "$1" = --version ] && { echo "kestrel-cli %s"; exit 0; }\n. /usr/share/kestrel/defaults.conf; echo "kestrel-cli -> $endpoint"\n' "$VER" > $b/usr/bin/kestrel-cli
chmod 755 $b/usr/bin/kestrel-cli
dpkg-deb --build -Zgzip $b /var/cache/kestrel/kestrel-cli_${VER}_all.deb >/dev/null
rm -rf /tmp/pkgbuild
X
