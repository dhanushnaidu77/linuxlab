on app01 <<'X'
set -e
dpkg -P darkroom-cli darkroom-common >/dev/null 2>&1 || true
rm -rf /tmp/pkgbuild /var/cache/darkroom; mkdir -p /tmp/pkgbuild /var/cache/darkroom
b=/tmp/pkgbuild/common; mkdir -p $b/DEBIAN $b/usr/share/darkroom
printf 'Package: darkroom-common\nVersion: %s\nArchitecture: all\nMaintainer: platform@darkroom.internal\nDescription: Darkroom shared files\n' "$VER" > $b/DEBIAN/control
echo "endpoint=http://app01.darkroom.internal:8080" > $b/usr/share/darkroom/defaults.conf
dpkg-deb --build -Zgzip $b /var/cache/darkroom/darkroom-common_${VER}_all.deb >/dev/null
b=/tmp/pkgbuild/cli; mkdir -p $b/DEBIAN $b/usr/bin
printf 'Package: darkroom-cli\nVersion: %s\nArchitecture: all\nDepends: darkroom-common (>= %s)\nMaintainer: platform@darkroom.internal\nDescription: Darkroom command line tool\n' "$VER" "$VER" > $b/DEBIAN/control
printf '#!/bin/bash\n[ "$1" = --version ] && { echo "darkroom-cli %s"; exit 0; }\n. /usr/share/darkroom/defaults.conf; echo "darkroom-cli -> $endpoint"\n' "$VER" > $b/usr/bin/darkroom-cli
chmod 755 $b/usr/bin/darkroom-cli
dpkg-deb --build -Zgzip $b /var/cache/darkroom/darkroom-cli_${VER}_all.deb >/dev/null
rm -rf /tmp/pkgbuild
X
