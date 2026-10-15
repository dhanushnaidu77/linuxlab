FROM lab/base
RUN apt-get update && apt-get install -y --no-install-recommends bind9 bind9-utils && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY named.conf.local /etc/bind/named.conf.local
COPY named.conf.options /etc/bind/named.conf.options
COPY db.kestrel.internal /etc/bind/db.kestrel.internal
COPY db.10.10 /etc/bind/db.10.10
RUN systemctl enable named
