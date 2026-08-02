#!/usr/bin/env bash
set -euo pipefail

DESTINO="${1:-/var/lib/node_exporter/textfile_collector/vic_firewall.prom}"
VENTANA_SEGUNDOS="${VIC_FIREWALL_WINDOW_SECONDS:-300}"
SERVIDOR="$(hostname | tr -cd '[:alnum:]_.-')"

mkdir -p "$(dirname "$DESTINO")"
TEMPORAL="$(mktemp "${DESTINO}.XXXXXX")"
trap 'rm -f "$TEMPORAL"' EXIT

ESTADO_UFW="$(ufw status verbose 2>/dev/null || true)"
if grep -q '^Status: active' <<<"$ESTADO_UFW"; then
  ACTIVO=1
else
  ACTIVO=0
fi

if grep -Eq '^Default: deny \(incoming\)' <<<"$ESTADO_UFW"; then
  ENTRADA_DENEGADA=1
else
  ENTRADA_DENEGADA=0
fi

REGLAS="$(ufw status numbered 2>/dev/null | grep -Ec '^\[[[:space:]]*[0-9]+\]' || true)"
DESDE="$(date --date="-${VENTANA_SEGUNDOS} seconds" '+%Y-%m-%d %H:%M:%S')"
REGISTROS="$(journalctl --no-pager -k --since "$DESDE" 2>/dev/null || true)"
BLOQUEOS="$(grep -c '\[UFW BLOCK\]' <<<"$REGISTROS" || true)"
PERMITIDOS="$(grep -c '\[UFW ALLOW\]' <<<"$REGISTROS" || true)"

cat >"$TEMPORAL" <<EOF
# HELP vic_firewall_activo Indica si UFW se encuentra activo.
# TYPE vic_firewall_activo gauge
vic_firewall_activo{servidor="$SERVIDOR"} $ACTIVO
# HELP vic_firewall_politica_entrada_denegar Indica si la politica de entrada es denegar.
# TYPE vic_firewall_politica_entrada_denegar gauge
vic_firewall_politica_entrada_denegar{servidor="$SERVIDOR"} $ENTRADA_DENEGADA
# HELP vic_firewall_reglas_activas Numero de reglas activas de UFW.
# TYPE vic_firewall_reglas_activas gauge
vic_firewall_reglas_activas{servidor="$SERVIDOR"} $REGLAS
# HELP vic_firewall_bloqueos_ventana Bloqueos registrados por UFW durante la ventana reciente.
# TYPE vic_firewall_bloqueos_ventana gauge
vic_firewall_bloqueos_ventana{servidor="$SERVIDOR"} $BLOQUEOS
# HELP vic_firewall_permitidos_ventana Conexiones permitidas registradas por UFW durante la ventana reciente.
# TYPE vic_firewall_permitidos_ventana gauge
vic_firewall_permitidos_ventana{servidor="$SERVIDOR"} $PERMITIDOS
# HELP vic_firewall_ventana_segundos Duracion de la ventana de observacion del firewall.
# TYPE vic_firewall_ventana_segundos gauge
vic_firewall_ventana_segundos{servidor="$SERVIDOR"} $VENTANA_SEGUNDOS
EOF

chmod 644 "$TEMPORAL"
mv -f "$TEMPORAL" "$DESTINO"
trap - EXIT
