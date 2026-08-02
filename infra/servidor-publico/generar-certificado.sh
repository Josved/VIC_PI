#!/usr/bin/env bash
set -euo pipefail

cd /opt/vic/infra/servidor-publico
mkdir -p certificados

ip_publica="${1:-127.0.0.1}"
dns_publico="${2:-vic.local}"
openssl req -x509 -nodes -newkey rsa:3072 -sha256 -days 365 \
  -keyout certificados/vic.key \
  -out certificados/vic.crt \
  -subj '/C=MX/O=VIC/CN=vic.local' \
  -addext "subjectAltName=DNS:vic.local,DNS:localhost,DNS:${dns_publico},IP:127.0.0.1,IP:${ip_publica}"

chmod 600 certificados/vic.key
chmod 644 certificados/vic.crt
