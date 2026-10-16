FROM lab/base
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN useradd -r -m -d /opt/darkroom -s /usr/sbin/nologin darkroom && mkdir -p /etc/darkroom /var/log/darkroom /srv/reports \
 && chown darkroom:darkroom /var/log/darkroom /srv/reports
COPY darkroom-api.py /opt/darkroom/darkroom-api.py
COPY api.conf /etc/darkroom/api.conf
COPY darkroom-api.service /etc/systemd/system/darkroom-api.service
COPY nightly-report.sh /opt/darkroom/nightly-report.sh
COPY nightly-report.cron /etc/cron.d/nightly-report
RUN chmod 755 /opt/darkroom/*.sh /opt/darkroom/*.py && chmod 644 /etc/cron.d/nightly-report && systemctl enable darkroom-api
