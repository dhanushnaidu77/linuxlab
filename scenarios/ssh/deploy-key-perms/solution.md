## Investigate
```bash
ssh -v deploy@web01                      # client side: "Offering public key ... we did not send a packet"
ssh web01 'sudo journalctl -u ssh -n 20' # server side: "Authentication refused: bad ownership or modes for ..."
ssh web01 'sudo ls -ld /home/deploy /home/deploy/.ssh /home/deploy/.ssh/authorized_keys'
```

## Fix
```bash
ssh web01
sudo chmod 755 /home/deploy                       # or 750/700; never group/world-writable
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

## Notes
The server log is where SSH tells you the real reason — the client deliberately says very little.
`ssh -vvv` on the client side shows which keys were offered and what the server answered.
