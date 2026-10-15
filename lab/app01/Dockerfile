FROM lab/base
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN useradd -r -m -d /opt/kestrel -s /usr/sbin/nologin kestrel && mkdir -p /etc/kestrel /var/log/kestrel /srv/reports \
 && chown kestrel:kestrel /var/log/kestrel /srv/reports
COPY kestrel-api.py /opt/kestrel/kestrel-api.py
COPY api.conf /etc/kestrel/api.conf
COPY kestrel-api.service /etc/systemd/system/kestrel-api.service
COPY nightly-report.sh /opt/kestrel/nightly-report.sh
COPY nightly-report.cron /etc/cron.d/nightly-report
RUN chmod 755 /opt/kestrel/*.sh /opt/kestrel/*.py && chmod 644 /etc/cron.d/nightly-report && systemctl enable kestrel-api
