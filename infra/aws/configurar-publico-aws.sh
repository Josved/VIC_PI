#!/usr/bin/env bash
set -euo pipefail

test "$(id -u)" -eq 0 || { echo 'Ejecuta este script como root.' >&2; exit 1; }
ip_privada="${1:?Indica la IP privada del servidor privado}"
ip_publica="${2:?Indica la IP publica del servidor publico}"
dns_publico="${3:?Indica el DNS publico del servidor publico}"
cd /opt/vic/infra/servidor-publico

sed -i "s/10\.20\.0\.20/${ip_privada}/g" nginx.conf
bash generar-certificado.sh "$ip_publica" "$dns_publico"

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH administracion'
ufw allow 80/tcp comment 'HTTP redireccion HTTPS'
ufw allow 443/tcp comment 'HTTPS VIC'
ufw allow from "$ip_privada" to any port 9100 proto tcp comment 'Metricas para Prometheus privado'
ufw logging low
ufw --force enable

install -d -m 755 /var/lib/node_exporter/textfile_collector
install -m 755 ../firewall/exportar_metricas_ufw.sh /usr/local/sbin/vic-exportar-metricas-ufw
install -m 644 ../firewall/vic-firewall-metricas.service /etc/systemd/system/vic-firewall-metricas.service
install -m 644 ../firewall/vic-firewall-metricas.timer /etc/systemd/system/vic-firewall-metricas.timer
systemctl daemon-reload
systemctl enable --now vic-firewall-metricas.timer
systemctl start vic-firewall-metricas.service

docker compose up -d --build
docker compose ps
