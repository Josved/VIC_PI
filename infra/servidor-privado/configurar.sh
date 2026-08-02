#!/usr/bin/env bash
set -euo pipefail

cd /opt/vic/infra/servidor-privado

ip_servidor_publico="${VIC_PUBLIC_SERVER_IP:-10.20.0.10}"

test -f .env || { echo 'Falta crear infra/servidor-privado/.env'; exit 1; }

install -m 600 netplan.yaml /etc/netplan/60-vic.yaml
netplan apply

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH administracion'
ufw allow from "$ip_servidor_publico" to any port 8001 proto tcp comment 'API replica A'
ufw allow from "$ip_servidor_publico" to any port 8002 proto tcp comment 'API replica B'
ufw allow from "$ip_servidor_publico" to any port 3000 proto tcp comment 'Grafana por proxy publico'
ufw logging low
ufw --force enable

install -d -m 755 /var/lib/node_exporter/textfile_collector
install -m 755 ../firewall/exportar_metricas_ufw.sh /usr/local/sbin/vic-exportar-metricas-ufw
install -m 644 ../firewall/vic-firewall-metricas.service /etc/systemd/system/vic-firewall-metricas.service
install -m 644 ../firewall/vic-firewall-metricas.timer /etc/systemd/system/vic-firewall-metricas.timer
systemctl daemon-reload
systemctl enable --now vic-firewall-metricas.timer
systemctl start vic-firewall-metricas.service

docker compose --env-file .env up -d --build
docker compose --env-file .env ps
