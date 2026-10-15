FROM lab/base
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client mtr-tiny nmap whois git tmux && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY motd /etc/motd
RUN chmod -x /etc/update-motd.d/* 2>/dev/null; echo 'cat /etc/motd' >> /home/dhan/.bashrc
