#!/usr/bin/env bash
set -euo pipefail

cd /opt/vic/infra/servidor-privado

test -f .env || { echo 'Falta crear infra/servidor-privado/.env'; exit 1; }

install -m 600 netplan.yaml /etc/netplan/60-vic.yaml
netplan apply

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH administracion'
ufw allow from 10.20.0.10 to any port 8001 proto tcp comment 'API replica A'
ufw allow from 10.20.0.10 to any port 8002 proto tcp comment 'API replica B'
ufw allow from 10.20.0.10 to any port 3000 proto tcp comment 'Grafana por proxy publico'
ufw --force enable

docker compose --env-file .env up -d --build
docker compose --env-file .env ps
