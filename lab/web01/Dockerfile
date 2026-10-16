FROM lab/base
RUN apt-get update && apt-get install -y --no-install-recommends nginx openssl && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN rm -f /etc/nginx/sites-enabled/default && mkdir -p /var/www/darkroom /etc/nginx/ssl \
 && openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=web01.darkroom.internal" \
      -keyout /etc/nginx/ssl/darkroom.key -out /etc/nginx/ssl/darkroom.crt 2>/dev/null
COPY darkroom.conf /etc/nginx/sites-available/darkroom
COPY index.html /var/www/darkroom/index.html
RUN ln -s /etc/nginx/sites-available/darkroom /etc/nginx/sites-enabled/darkroom && systemctl enable nginx
