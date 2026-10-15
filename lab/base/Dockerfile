FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive container=docker
RUN apt-get update && apt-get install -y --no-install-recommends \
      systemd systemd-sysv dbus sudo openssh-server openssh-client \
      iproute2 iputils-ping iputils-tracepath traceroute nftables iptables tcpdump dnsutils netcat-openbsd \
      curl wget ca-certificates net-tools procps psmisc htop lsof strace sysstat \
      vim nano less jq tree file rsync cron logrotate acl bc python3 bash-completion \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
# trim systemd units that make no sense in a container
RUN systemctl mask systemd-udevd.service systemd-udevd-kernel.socket systemd-udevd-control.socket \
      systemd-modules-load.service sys-kernel-debug.mount sys-kernel-tracing.mount \
      systemd-remount-fs.service getty.target console-getty.service systemd-firstboot.service \
      systemd-networkd-wait-online.service systemd-resolved.service 2>/dev/null; \
    systemctl enable ssh cron
# lab user + shared lab keypair (lab-only, never used outside the containers)
RUN userdel -r ubuntu 2>/dev/null; useradd -m -s /bin/bash -u 1000 dhan \
    && echo 'dhan ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/dhan && chmod 440 /etc/sudoers.d/dhan \
    && mkdir -p /home/dhan/.ssh && ssh-keygen -q -t ed25519 -N '' -C lab -f /home/dhan/.ssh/id_ed25519 \
    && cp /home/dhan/.ssh/id_ed25519.pub /home/dhan/.ssh/authorized_keys \
    && printf 'Host *\n  StrictHostKeyChecking accept-new\n  UserKnownHostsFile /dev/null\n  LogLevel ERROR\n' > /home/dhan/.ssh/config \
    && chown -R dhan:dhan /home/dhan/.ssh && chmod 700 /home/dhan/.ssh && chmod 600 /home/dhan/.ssh/*
RUN sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
COPY lab-entrypoint /usr/local/sbin/lab-entrypoint
COPY lab-net.sh /usr/local/sbin/lab-net.sh
COPY lab-net.service /etc/systemd/system/lab-net.service
RUN chmod +x /usr/local/sbin/lab-entrypoint /usr/local/sbin/lab-net.sh && systemctl enable lab-net.service
STOPSIGNAL SIGRTMIN+3
ENTRYPOINT ["/usr/local/sbin/lab-entrypoint"]
