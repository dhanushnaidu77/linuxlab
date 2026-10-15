key=$(on jump01 'cat /home/dhan/.ssh/id_ed25519.pub')
on web01 <<X
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$key" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys; chmod 600 /home/deploy/.ssh/authorized_keys; chmod 755 /home/deploy
case \$BREAK in
  home) chmod 777 /home/deploy ;;
  sshdir) chmod 777 /home/deploy/.ssh ;;
  authkeys) chmod 666 /home/deploy/.ssh/authorized_keys ;;
esac
X
