#!/usr/bin/env python3
"""Fill gaps in data/raw/osm_toll_booths_india.json by downloading a box in small tiles.

Usage: python3 scripts/fetch_osm_fill.py LAT0 LON0 LAT1 LON1 [STEP_DEG]
  e.g. python3 scripts/fetch_osm_fill.py 26 76 30 80 1     (Delhi NCR / western UP, 16 tiles)
Each tile asks Overpass for barrier=toll_booth nodes and ways, retries on busy servers, and merges the
result into the India file (deduplicated by OSM type/id). Safe to re-run.
"""
import json, os, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "raw", "osm_toll_booths_india.json")
SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"]


def fetch(bb):
    q = f'[out:json][timeout:90];(node["barrier"="toll_booth"]({bb});way["barrier"="toll_booth"]({bb}););out center tags;'
    data = urllib.parse.urlencode({"data": q}).encode()
    for attempt in range(4):
        for s in SERVERS:
            try:
                req = urllib.request.Request(s, data=data, headers={"User-Agent": "tollcheck-india"})
                return json.load(urllib.request.urlopen(req, timeout=120))["elements"]
            except Exception as e:
                last = e
        time.sleep(15 * (attempt + 1))
    raise RuntimeError(f"tile {bb} failed: {last}")


def main():
    lat0, lon0, lat1, lon1 = map(float, sys.argv[1:5])
    step = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
    have = json.load(open(OUT)) if os.path.exists(OUT) else {"elements": []}
    seen = {(e["type"], e["id"]) for e in have["elements"]}
    added, failed = 0, []
    lat = lat0
    while lat < lat1:
        lon = lon0
        while lon < lon1:
            bb = f"{lat},{lon},{lat + step},{lon + step}"
            try:
                els = fetch(bb)
                new = [e for e in els if (e["type"], e["id"]) not in seen]
                for e in new: seen.add((e["type"], e["id"]))
                have["elements"].extend(new); added += len(new)
                print(f"tile {bb}: {len(els)} booths, {len(new)} new", flush=True)
                json.dump(have, open(OUT, "w"))          # save after every tile
            except Exception as e:
                failed.append(bb); print(f"tile {bb}: FAILED ({e})", flush=True)
            time.sleep(2)
            lon += step
        lat += step
    print(f"added {added}; total {len(have['elements'])}; failed tiles: {failed or 'none'}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
