on app01 'dpkg-query -W -f="\${Status}" kestrel-cli 2>/dev/null | grep -q "install ok installed"' || fail "dpkg says kestrel-cli isn't (fully) installed"
on app01 'kestrel-cli --version 2>/dev/null | grep -q "$VER"' || fail "kestrel-cli --version doesn't work / wrong version"
on app01 'dpkg --audit | grep -q .' && fail "dpkg --audit reports broken/half-installed packages"
exit 0
