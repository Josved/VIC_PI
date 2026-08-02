#!/usr/bin/env bash
set -euo pipefail

test "$(id -u)" -eq 0 || { echo 'Ejecuta este script como root.' >&2; exit 1; }
ip_publica_privada="${1:?Indica la IP privada del servidor publico}"
host_publico="${2:?Indica el DNS publico del servidor publico}"
cd /opt/vic/infra/servidor-privado

if [[ ! -f .env ]]; then
  secreto_jwt="$(openssl rand -hex 48)"
  clave_grafana="$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9' | head -c 28)"
  cat >.env <<EOF
VIC_JWT_SECRET=$secreto_jwt
VIC_TOKEN_EXPIRATION_MINUTES=60
VIC_CORS_ORIGINS=https://$host_publico
VIC_PUBLIC_URL=https://$host_publico
VIC_SMTP_HOST=
VIC_SMTP_PORT=587
VIC_SMTP_USERNAME=
VIC_SMTP_PASSWORD=
VIC_SMTP_FROM_EMAIL=
VIC_SMTP_FROM_NAME=VIC
VIC_SMTP_USE_STARTTLS=true
VIC_SMTP_USE_SSL=false
GRAFANA_ADMIN_USER=vicadmin
GRAFANA_ADMIN_PASSWORD=$clave_grafana
EOF
  chmod 600 .env
  printf 'Grafana usuario: vicadmin\nGrafana clave: %s\n' "$clave_grafana" >/root/vic-credenciales.txt
  chmod 600 /root/vic-credenciales.txt
fi

sed -i "s/10\.20\.0\.10/${ip_publica_privada}/g" prometheus.yml

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow from "$ip_publica_privada" to any port 22 proto tcp comment 'SSH por bastion publico'
ufw allow from "$ip_publica_privada" to any port 8001 proto tcp comment 'API replica A'
ufw allow from "$ip_publica_privada" to any port 8002 proto tcp comment 'API replica B'
ufw allow from "$ip_publica_privada" to any port 3000 proto tcp comment 'Grafana por proxy publico'
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
