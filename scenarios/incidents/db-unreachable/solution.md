## Investigate
```bash
ssh app01 'nc -zv -w3 db01 5432'               # timeout (filtered) or refused (nothing listening)
ssh db01
sudo ss -ltnp | grep 5432                      # 127.0.0.1:5432 only!
grep listen_addresses /etc/postgresql/16/main/postgresql.conf
sudo nft list ruleset                          # tcp dport 5432 drop
```

## Fix
```bash
sudo sed -i "s/^listen_addresses.*/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
sudo systemctl restart postgresql
sudo nft -a list chain inet filter input        # find the rule handle
sudo nft delete rule inet filter input handle <N>
```

## Reading nc results
- **Connection refused** → packet arrived, nothing listening on that address/port (or REJECT rule).
- **Timeout** → packets silently dropped (DROP rule) or routing problem.
- With two faults, the symptom changes as you fix the first one — that's progress, not a new problem.
