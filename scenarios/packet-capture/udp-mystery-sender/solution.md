## Fix
```bash
ssh db01
sudo tcpdump -ni eth0 -c 5 udp port {{PORT}}
# 12:00:01.123 IP {{SRCIP}}.51234 > 10.10.3.20.{{PORT}}: UDP, length 14
```
Source = `{{SRCIP}}` ({{SRC}}). Then on {{SRC}}: `sudo ss -uap | grep {{PORT}}` or `ps aux` to find the culprit loop.

## tcpdump cheat sheet
- `-n` no DNS lookups · `-i any` all interfaces · `-c N` stop after N packets · `-A` print payload as ASCII
- filters: `host 10.10.3.10`, `port 53`, `tcp and dst port 443`, `not port 22` (exclude your own ssh!)
- `-w file.pcap` to save and open later in Wireshark
