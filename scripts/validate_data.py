#!/usr/bin/env python3
"""Validate web/plazas.json. Prints every problem found; exit 1 if any hard error.

Hard errors (must be 0):
  E1 duplicate plaza ids / NETC codes
  E2 coordinates outside India
  E3 coordinates in a different state than the plaza's own state (via nearest GeoNames place)
Warnings (listed for review):
  W1 official covered plazas (IHMCL) with no location
  W2 official plazas with no OSM booth within 1 km (location may be off, or plaza gone)
  W3 unknown-status plazas
  W4 covered and pay plazas within 150 m (usually two roads side by side: check on a map)
Usage: python3 scripts/validate_data.py [--verbose]
"""
import csv, io, json, math, os, re, sys, zipfile, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = "--verbose" in sys.argv


def km(a, b):
    return math.hypot((a[1] - b[1]) * 111.32 * math.cos(math.radians(a[0])), (a[0] - b[0]) * 111.32)


def norm_state(s):
    s = re.sub(r"[^a-z]", "", (s or "").lower())
    return {"orissa": "odisha", "uttaranchal": "uttarakhand", "nctofdelhi": "delhi", "pondicherry": "puducherry"}.get(s, s)


def main():
    P = json.load(open(os.path.join(ROOT, "web", "plazas.json")))["plazas"]
    hard, warn = collections.defaultdict(list), collections.defaultdict(list)

    # E1
    ids = collections.Counter(p["id"] for p in P)
    hard["E1 duplicate ids"] = [i for i, n in ids.items() if n > 1]
    # E2
    hard["E2 outside India"] = [p["id"] for p in P if not (6 <= p["lat"] <= 37.5 and 68 <= p["lon"] <= 98)]

    # E3: state check against nearest GeoNames populated place (grid lookup)
    states = {}
    for r in csv.reader(open(os.path.join(ROOT, "data", "raw", "geonames-admin1CodesASCII.txt"), encoding="utf-8"), delimiter="\t"):
        if r[0].startswith("IN."): states[r[0][3:]] = r[1]
    grid = collections.defaultdict(list)
    with zipfile.ZipFile(os.path.join(ROOT, "data", "raw", "geonames-IN.zip")) as z:
        for line in io.TextIOWrapper(z.open("IN.txt"), encoding="utf-8"):
            r = line.split("\t")
            if r[6] != "P": continue
            la, lo = float(r[4]), float(r[5])
            grid[(int(la * 10), int(lo * 10))].append((la, lo, states.get(r[10], "")))
    def place_state(la, lo):
        best = None
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for q in grid.get((int(la * 10) + dx, int(lo * 10) + dy), []):
                    d = km((la, lo), q)
                    if best is None or d < best[0]: best = (d, q[2])
        return best
    for p in P:
        if not p.get("state") or p["id"].startswith("osm-"): continue
        ps = norm_state(p["state"])
        if len(ps) < 4: continue
        b = place_state(p["lat"], p["lon"])
        if b and b[0] < 8 and norm_state(b[1]) and norm_state(b[1]) != ps:
            # border plazas legitimately sit next to another state's village: only flag if far inside
            far = [place_state(p["lat"] + dy, p["lon"] + dx) for dx, dy in ((0.15, 0), (-0.15, 0), (0, 0.15), (0, -0.15))]
            if all(f and norm_state(f[1]) != ps for f in far):
                hard["E3 coordinates in wrong state"].append(f'{p["id"]} {p["name"]}: says {p["state"]}, location is in {b[1]}')

    # E4: conflicting status very close together
    official = [p for p in P if not p["id"].startswith("osm-")]
    g2 = collections.defaultdict(list)
    for p in official: g2[(int(p["lat"] * 100), int(p["lon"] * 100))].append(p)
    seen = set()
    for p in official:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for q in g2.get((int(p["lat"] * 100) + dx, int(p["lon"] * 100) + dy), []):
                    if q["id"] <= p["id"] or (p["id"], q["id"]) in seen: continue
                    if km((p["lat"], p["lon"]), (q["lat"], q["lon"])) < 0.15 and {p["pass_covered"], q["pass_covered"]} == {True, False}:
                        seen.add((p["id"], q["id"]))
                        warn["W4 covered + pay plaza side by side (different roads?)"].append(f'{p["name"]} ({p["pass_covered"]}) vs {q["name"]} ({q["pass_covered"]})')

    # W1
    f = os.path.join(ROOT, "data", "processed", "covered_without_location.csv")
    warn["W1 covered plazas without location"] = [r["name"] for r in csv.DictReader(open(f))] if os.path.exists(f) else []
    # W2
    osm = [p for p in P if p.get("osm_ids")]
    warn["W2 official plaza, no OSM booth matched"] = [p["name"] for p in official if not p.get("osm_ids")]
    # W3
    warn["W3 unknown status"] = [f'{p["name"]} ({p.get("operator") or "?"})' for p in P if p["pass_covered"] is None]

    bad = 0
    print(f"plazas: {len(P)} (covered {sum(p['pass_covered'] is True for p in P)}, pay {sum(p['pass_covered'] is False for p in P)}, unknown {sum(p['pass_covered'] is None for p in P)})")
    for k, v in hard.items():
        print(f"{'FAIL' if v else 'ok  '} {k}: {len(v)}"); bad += bool(v)
        for x in v[: (100 if V else 8)]: print("      ", x)
    for k, v in warn.items():
        print(f"warn {k}: {len(v)}")
        for x in v[: (100 if V else 5)]: print("      ", x)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
