on app01 'dpkg-query -W -f="\${Status}" darkroom-cli 2>/dev/null | grep -q "install ok installed"' || fail "dpkg says darkroom-cli isn't (fully) installed"
on app01 'darkroom-cli --version 2>/dev/null | grep -q "$VER"' || fail "darkroom-cli --version doesn't work / wrong version"
on app01 'dpkg --audit | grep -q .' && fail "dpkg --audit reports broken/half-installed packages"
exit 0
