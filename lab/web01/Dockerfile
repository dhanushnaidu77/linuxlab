FROM lab/base
RUN apt-get update && apt-get install -y --no-install-recommends nginx openssl && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN rm -f /etc/nginx/sites-enabled/default && mkdir -p /var/www/kestrel /etc/nginx/ssl \
 && openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=web01.kestrel.internal" \
      -keyout /etc/nginx/ssl/kestrel.key -out /etc/nginx/ssl/kestrel.crt 2>/dev/null
COPY kestrel.conf /etc/nginx/sites-available/kestrel
COPY index.html /var/www/kestrel/index.html
RUN ln -s /etc/nginx/sites-available/kestrel /etc/nginx/sites-enabled/kestrel && systemctl enable nginx
