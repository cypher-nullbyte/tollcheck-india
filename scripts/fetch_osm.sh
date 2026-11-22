#!/usr/bin/env bash
# Download every OpenStreetMap toll booth in India into data/raw/osm_toll_booths_india.json.
# One all-India query times out on the busy public servers, so this fetches 4x4-degree tiles
# (one request at a time, with a pause) and merges them. Tiles over the sea return nothing.
set -uo pipefail
cd "$(dirname "$0")/.."
SERVERS=(https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter)
TMP=$(mktemp -d)
fail=0
for lat in 6 10 14 18 22 26 30 34; do
  for lon in 68 72 76 80 84 88 92 96; do
    bb="$lat,$lon,$((lat+4)),$((lon+4))"
    q="[out:json][timeout:90];(node[\"barrier\"=\"toll_booth\"]($bb);way[\"barrier\"=\"toll_booth\"]($bb););out center tags;"
    ok=0
    for attempt in 1 2 3; do
      for h in "${SERVERS[@]}"; do
        code=$(curl -s --max-time 120 -A "tollcheck-india" --data-urlencode "data=$q" "$h" -o "$TMP/$lat-$lon.json" -w "%{http_code}" || true)
        if [ "$code" = 200 ]; then ok=1; break 2; fi
      done
      sleep $((attempt * 15))
    done
    if [ $ok = 1 ]; then
      echo "tile $bb ok"
    else
      echo "tile $bb FAILED" >&2; rm -f "$TMP/$lat-$lon.json"; fail=1
    fi
    sleep 2
  done
done
python3 - "$TMP" data/raw/osm_toll_booths_india.json <<'EOF'
import json, sys, glob, os
seen, out = set(), []
for fn in sorted(glob.glob(os.path.join(sys.argv[1], "*.json"))):
    for e in json.load(open(fn))["elements"]:
        if (e["type"], e["id"]) not in seen:
            seen.add((e["type"], e["id"])); out.append(e)
json.dump({"elements": out, "note": "barrier=toll_booth, India tiles; (c) OpenStreetMap contributors, ODbL"},
          open(sys.argv[2], "w"))
print(f"saved {len(out)} booths -> {sys.argv[2]}")
EOF
rm -rf "$TMP"
[ $fail = 0 ] || { echo "some tiles failed: file is incomplete, run again later" >&2; exit 1; }
