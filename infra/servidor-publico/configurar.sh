#!/usr/bin/env bash
set -euo pipefail

cd /opt/vic/infra/servidor-publico

install -m 600 netplan.yaml /etc/netplan/60-vic.yaml
netplan apply

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH administracion'
ufw allow 80/tcp comment 'HTTP redireccion HTTPS'
ufw allow 443/tcp comment 'HTTPS VIC'
ufw --force enable

docker compose up -d --build
docker compose ps
