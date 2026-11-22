#!/usr/bin/env bash
# One command to refresh all plaza data (see data/sources.json).
#   scripts/update_data.sh            # everything except the slow OSM download
#   scripts/update_data.sh --osm      # also re-download OSM toll booths (1-2 hours)
# Manual sources (sites that block scripts) are only CHECKED: save them from a browser first.
set -uo pipefail
cd "$(dirname "$0")/.."
RAW=data/raw
PY=${PY:-python3}
ok() { echo "  ok    $*"; }
warn() { echo "  WARN  $*"; }

echo "1) IHMCL NH fee plaza list: newest link on https://ihmcl.co.in/nh-toll-plaza/"
link=$(curl -s -L --max-time 60 https://ihmcl.co.in/nh-toll-plaza/ | grep -o -E 'https://ihmcl\.co\.in/wp-content/uploads/[0-9]{4}/[0-9]{2}/NH-Fee-Plaza[^"]*\.pdf' | head -1)
if [ -n "$link" ]; then
  ym=$(echo "$link" | grep -o -E 'uploads/[0-9]{4}/[0-9]{2}' | sed 's#uploads/##; s#/#-#')
  f="$RAW/ihmcl-nh-fee-plazas-$ym.pdf"
  [ -f "$f" ] && ok "already have $f" || { curl -s -L --max-time 120 -o "$f" "$link" && ok "downloaded $link -> $f"; }
  $PY scripts/parse_ihmcl.py "$f" "$RAW/ihmcl_nh_fee_plazas_$ym.csv"
  echo "     (build uses IHMCL_FILE in scripts/build_plazas.py; update it if $ym is newer)"
else
  warn "could not find the PDF link on the IHMCL page"
fi

echo "2) Automatic files (download only if missing)"
for pair in \
  "ihmcl-nh-toll-plaza-2025-08.pdf|https://ihmcl.co.in/wp-content/uploads/2025/08/NH-Toll-Plaza-.pdf" \
  "npci-plaza-master-2025-05.pdf|https://web.archive.org/web/20250623111732id_/https://www.npci.org.in/PDF/netc/Plaza-Master-May-2025.pdf" \
  "npci-plaza-master-2026-02.pdf|https://web.archive.org/web/20260509053822id_/https://www.netc.org.in/uploads/Plaza_Master_Feb_26_2ddf69d321.pdf" \
  "nhai_tis_2022-01-01.csv|https://raw.githubusercontent.com/geohacker/toll-plazas-india/master/data/01-01-2022/tolls-with-metadata.csv"; do
  f="$RAW/${pair%%|*}"; u="${pair#*|}"
  [ -f "$f" ] && ok "have $f" || { curl -s -L --max-time 180 -o "$f" "$u" && ok "downloaded $f"; }
done

echo "3) Manual files (save from a browser into $RAW/)"
for pair in \
  "npci-plaza-master-2026-09.pdf|https://www.netc.org.in  (latest Plaza_Master_*.pdf)" \
  "opencity-toll-plazas-2024.kml|https://data.opencity.in/dataset/toll-plazas-in-india"; do
  f="$RAW/${pair%%|*}"
  [ -f "$f" ] && ok "have $f" || warn "MISSING $f  -> download from ${pair#*|}"
done

echo "4) Parse"
$PY scripts/parse_ihmcl.py "$RAW/ihmcl-nh-toll-plaza-2025-08.pdf" "$RAW/ihmcl_nh_fee_plazas_2025-08.csv"
$PY scripts/parse_npci.py "$RAW/npci-plaza-master-2025-05.pdf" "$RAW/npci_plaza_master_2025-05.csv"
[ -f "$RAW/npci-plaza-master-2026-09.pdf" ] && $PY scripts/parse_netc.py "$RAW/npci-plaza-master-2026-09.pdf" "$RAW/netc_plaza_master_2026-09.csv"

if [ "${1:-}" = "--osm" ]; then
  echo "5) OpenStreetMap toll booths (slow)"
  scripts/fetch_osm.sh || warn "some OSM squares failed; file is incomplete"
fi

echo "6) Build plazas.json"
$PY scripts/build_plazas.py
