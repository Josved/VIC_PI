#!/usr/bin/env bash
set -euo pipefail

DESTINO="${1:-/var/lib/node_exporter/textfile_collector/vic_firewall.prom}"
VENTANA_SEGUNDOS="${VIC_FIREWALL_WINDOW_SECONDS:-300}"
SERVIDOR="$(hostname | tr -cd '[:alnum:]_.-')"

mkdir -p "$(dirname "$DESTINO")"
TEMPORAL="$(mktemp "${DESTINO}.XXXXXX")"
trap 'rm -f "$TEMPORAL"' EXIT

if grep -q '^ENABLED=yes' /etc/ufw/ufw.conf 2>/dev/null; then
  ACTIVO=1
else
  ACTIVO=0
fi

if grep -q '^DEFAULT_INPUT_POLICY="DROP"' /etc/default/ufw 2>/dev/null; then
  ENTRADA_DENEGADA=1
else
  ENTRADA_DENEGADA=0
fi

REGLAS="$(grep -h '^### tuple ###' /etc/ufw/user.rules /etc/ufw/user6.rules 2>/dev/null | wc -l || true)"
DESDE="$(date --date="-${VENTANA_SEGUNDOS} seconds" '+%Y-%m-%d %H:%M:%S')"
REGISTROS="$(journalctl --no-pager -k --since "$DESDE" --grep='\[UFW (BLOCK|ALLOW)\]' 2>/dev/null || true)"
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
