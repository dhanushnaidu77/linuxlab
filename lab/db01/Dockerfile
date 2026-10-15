FROM lab/base
RUN apt-get update && apt-get install -y --no-install-recommends postgresql && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf \
 && echo "host all all 10.10.0.0/16 scram-sha-256" >> /etc/postgresql/16/main/pg_hba.conf
COPY db-init.sh /usr/local/sbin/db-init.sh
COPY db-init.service /etc/systemd/system/db-init.service
RUN chmod +x /usr/local/sbin/db-init.sh && systemctl enable postgresql db-init
