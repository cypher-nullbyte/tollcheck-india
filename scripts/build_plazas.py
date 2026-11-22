#!/usr/bin/env python3
"""Merge the plaza sources into one plazas.json for the app.

Sources, in order of trust:
  1. IHMCL "National Highway (NH) Fee Plazas" (Jul 2026) -> THE covered list (by NETC plaza code)
  2. NPCI NETC Plaza Master (May 2025)  -> coordinates (joined by plaza code) + plazas IHMCL omits:
        in IHMCL list            -> pass_covered = true
        not in IHMCL, STATE      -> pass_covered = false (state / local plaza)
        not in IHMCL, NATIONAL   -> pass_covered = null  (sources disagree)
  3. NHAI TIS toll-plaza map (Jan 2022)  -> car rates; coordinates for IHMCL plazas NPCI lacks
        (unique name match only); other 2022-only plazas -> null (not in 2026 list)
  4. OpenStreetMap toll booths           -> booths no list has
        state-body operator tag -> false, otherwise null (unknown, never guessed)
Everything stays "unconfirmed" until checked by hand (e.g. in Rajmargyatra).

Standard library only:  python3 scripts/build_plazas.py
"""
import csv, json, math, re, glob, os, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = [os.path.join(ROOT, "data", "processed", "plazas.json"),
       os.path.join(ROOT, "web", "plazas.json")]

IHMCL_FILE = os.path.join(RAW, "ihmcl_nh_fee_plazas_2026-07.csv")
IHMCL_DATE = "2026-07"
NPCI_FILE = os.path.join(RAW, "netc_plaza_master_2026-09.csv")   # parse_netc.py; older: npci_plaza_master_2025-05.csv
NPCI_DATE = "2026-09"
NHAI_FILE = os.path.join(RAW, "nhai_tis_2022-01-01.csv")
NHAI_DATE = "2022-01-01"
NHAI_TO_NPCI_M = 1500    # same plaza in both lists (NHAI coordinates are rough)
OSM_CLUSTER_M = 700      # OSM booths closer than this are one plaza (both directions, lanes)
OSM_MATCH_M = 600        # OSM cluster this close to a listed plaza is that plaza
STATE_OPERATORS = re.compile(
    r"\b(MSRDC|MSIDC|UPEIDA|YEIDA|KRDCL|TNRDC|GSRDC|RSRDC|MPRDC|APRDC|HSRDC|PWD|BMC|MMRDA|"
    r"municipal|corporation|state)\b", re.I)
STOP = {"toll", "plaza", "naka", "booth", "fee", "the", "nh48", "morth", "virtual"}


def dist_m(a_lat, a_lon, b_lat, b_lon):
    r = 6371000.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def words(s):
    return set(re.findall(r"[a-z]{4,}", (s or "").lower())) - STOP


def clean(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or "")).strip()


def in_india(lat, lon):
    return 6 <= lat <= 37.5 and 68 <= lon <= 98


def load_ihmcl():
    return {r["code"]: r for r in csv.DictReader(open(IHMCL_FILE, encoding="utf-8")) if r["code"]}


NPCI_OLD_FILE = os.path.join(RAW, "npci_plaza_master_2025-05.csv")   # fallback coordinates, same plaza codes
OPENCITY_FILE = os.path.join(RAW, "opencity-toll-plazas-2024.kml")     # 2024; coordinates + car rates by plaza code
OPENCITY = "OpenCity Toll Plazas in India (2024)"


def load_opencity():
    """data.opencity.in/dataset/toll-plazas-in-india (KML, listed Public Domain). Keyed by NETC plaza code."""
    if not os.path.exists(OPENCITY_FILE):
        return {}
    import html as _h
    t = open(OPENCITY_FILE, encoding="utf-8").read()
    out = {}
    for pm in re.findall(r"(?s)<Placemark>(.*?)</Placemark>", t):
        d = {k: _h.unescape(v).strip() for k, v in re.findall(r'(?s)<SimpleData name="([^"]+)">(.*?)</SimpleData>', pm)}
        code = re.sub(r"\.0$", "", d.get("plaza_code", ""))
        try:
            lat, lon = float(d["lat"]), float(d["long"])
        except (KeyError, ValueError):
            continue
        num = lambda k: int(float(d[k])) if re.fullmatch(r"\d+(\.\d+)?", d.get(k, "")) else None
        out[code] = {"code": code, "name": " ".join(d.get("plaza_name", "").split()), "lat": lat, "lon": lon,
                     "sub_type": d.get("plaza_sub_type", "").upper(), "plaza_type": d.get("plaza_type", "").upper(),
                     "state": d.get("state") or "", "concessionaire": " ".join(d.get("concessionaire_name", "").split()),
                     "car_sj": num("carjeepvan_sj"), "car_rj": num("carjeepvan_rj")}
    return out


def load_npci(ihmcl, ocity):
    out = []
    old = {}
    if os.path.exists(NPCI_OLD_FILE):
        old = {r["code"]: r for r in csv.DictReader(open(NPCI_OLD_FILE, encoding="utf-8")) if r["lat"]}
    rows = list(csv.DictReader(open(NPCI_FILE, encoding="utf-8")))
    # Plazas that are ONLY in the 2024 OpenCity list are NOT added: none of them is in the Sep 2026
    # NETC list (the current list of operating FASTag plazas), so they are most likely closed or
    # re-coded (checked 2026-11-22: 57 such plazas, 17 of them within 1 km of a plaza we already have).
    # OpenCity is used only for coordinates and car rates of plazas that still exist.
    for r in rows:
        if r["plaza_type"] != "TOLL":
            continue
        coords_from = None
        if not r["lat"] and r["code"] in old:      # no usable coordinates in the new list: use May 2025's
            r = dict(r, lat=old[r["code"]]["lat"], lon=old[r["code"]]["lon"])
            coords_from = "NPCI Plaza Master (2025-05): location"
        if not r["lat"] and r["code"] in ocity:    # then the 2024 OpenCity list
            r = dict(r, lat=str(ocity[r["code"]]["lat"]), lon=str(ocity[r["code"]]["lon"]))
            coords_from = f"{OPENCITY}: location"
        if not r["lat"]:
            continue
        lat, lon = float(r["lat"]), float(r["lon"])
        if not in_india(lat, lon):
            continue
        ih = ihmcl.get(r["code"])
        if ih:
            covered, why = True, f"IHMCL NH fee plaza list ({IHMCL_DATE}), NH {ih['nh']}"
        elif r["sub_type"] == "STATE":
            covered, why = False, f"{r.get('_only') or f'NETC Plaza Master ({NPCI_DATE})'}: STATE, not in IHMCL NH list"
        elif re.search(r"\bNHAI\b|NATIONAL HIGHWAY", r["concessionaire"] or "", re.I):
            # Rule (agreed 2026-11-22): NHAI-run = NHAI toll. Checked: these are mostly expressway
            # ramp/interchange plazas whose corridor (DME, Delhi-Dehradun, NE-4, NE-4C) IS on the IHMCL list.
            covered, why = True, f"NETC ({NPCI_DATE}): NATIONAL, operator NHAI; not itself on IHMCL list ({IHMCL_DATE}), but NHAI-run"
        else:
            covered, why = None, f"{r.get('_only') or f'NETC ({NPCI_DATE})'} says NATIONAL but not in IHMCL NH list ({IHMCL_DATE})"
        out.append({
            "id": f"netc-{r['code']}",
            "code": r["code"],
            "name": ih["name"] if ih else r["name"],
            "lat": round(lat, 6), "lon": round(lon, 6),
            "state": (ih or r)["state"] or None,
            "highway": f"NH {ih['nh']}" if ih and ih["nh"] else None,
            "operator": r["concessionaire"] or None,
            "operator_type": "national" if covered else ("state" if covered is False else "unknown"),
            "pass_covered": covered,
            "coverage_reason": why,
            "car_rate_single": None, "car_rate_return": None, "effective_from": None,
            "sources": [r.get("_only") or f"NETC Plaza Master ({NPCI_DATE})"]
                       + ([coords_from] if coords_from and not r.get("_only") else [])
                       + ([f"IHMCL NH Fee Plazas ({IHMCL_DATE})"] if ih else []),
            "confidence": "unconfirmed",
            "coords_suspect": False,
            "last_checked": IHMCL_DATE if ih else NPCI_DATE,
        })
    return out


def load_nhai():
    plazas = []
    for r in csv.DictReader(open(NHAI_FILE, encoding="utf-8")):
        try:
            lat, lon = float(r["lat"]), float(r["lon"])
        except ValueError:
            continue
        if not in_india(lat, lon) and in_india(lon, lat):
            lat, lon = lon, lat                      # swapped in the source (e.g. "Dhareri jattan 76.5, 30.4")
        if not in_india(lat, lon):
            continue                                 # 0,0 / test rows / garbage in the 2022 source
        rates = json.loads(r["rates"]) if r["rates"] else {}
        contractor = clean(r["location"]).replace(clean(r["name"]), "", 1).strip()
        plazas.append({
            "id": f"nhai-{r['id']}",
            "name": r["name"].strip(),
            "lat": round(lat, 6), "lon": round(lon, 6),
            "state": None,
            "operator": contractor or None,
            # Rule: if NHAI lists it, it is an NHAI (NH) toll -> covered. Older source, so the reason says so.
            "operator_type": "national",
            "pass_covered": True,
            "coverage_reason": f"NHAI toll plaza list ({NHAI_DATE}); not matched in the 2026 lists, so check it",
            "car_rate_single": rates.get("car_single"),
            "car_rate_return": rates.get("car_multi"),
            "effective_from": r["fee_effective_date"] or None,
            "sources": [f"NHAI TIS map ({NHAI_DATE} snapshot)"],
            "confidence": "unconfirmed",
            "coords_suspect": False,
            "last_checked": NHAI_DATE,
        })
    # Two different NHAI plazas on the same spot = at least one has wrong coordinates.
    for i, a in enumerate(plazas):
        for b in plazas[i + 1:]:
            if a["name"] != b["name"] and dist_m(a["lat"], a["lon"], b["lat"], b["lon"]) < 50:
                a["coords_suspect"] = b["coords_suspect"] = True
    return plazas


def place_missing_ihmcl(ihmcl, npci, nhai):
    """IHMCL plazas with no NPCI coordinates: borrow coordinates from a UNIQUE name match in NHAI 2022."""
    have = {p["code"] for p in npci}
    placed, missing = [], []
    for code, ih in ihmcl.items():
        if code in have:
            continue
        w = words(ih["name"])
        # every distinctive word of the IHMCL name must appear in the 2022 name
        hits = [p for p in nhai if w and w <= words(p["name"])]
        if len(hits) == 1 and not hits[0]["coords_suspect"]:
            h = hits[0]
            h["_used"] = True
            placed.append({
                "id": f"netc-{code}", "code": code, "name": ih["name"],
                "lat": h["lat"], "lon": h["lon"], "state": ih["state"] or None,
                "highway": f"NH {ih['nh']}" if ih["nh"] else None,
                "operator": h["operator"], "operator_type": "national",
                "pass_covered": True,
                "coverage_reason": f"IHMCL NH fee plaza list ({IHMCL_DATE}), NH {ih['nh']}",
                "car_rate_single": h["car_rate_single"], "car_rate_return": h["car_rate_return"],
                "effective_from": h["effective_from"],
                "sources": [f"IHMCL NH Fee Plazas ({IHMCL_DATE})", f"NHAI TIS map ({NHAI_DATE}): location by name match"],
                "confidence": "unconfirmed", "coords_suspect": False, "last_checked": IHMCL_DATE,
            })
        else:
            missing.append(ih)
    return placed, missing


def merge_nhai(npci, nhai):
    """Attach 2022 rates to the matching NPCI plaza; keep NHAI plazas NPCI lacks."""
    kept, matched = [], 0
    for p in nhai:
        if p.get("_used"):
            continue
        cands = [q for q in npci if dist_m(p["lat"], p["lon"], q["lat"], q["lon"]) < NHAI_TO_NPCI_M]
        w = words(p["name"])
        cands.sort(key=lambda q: (not (w & words(q["name"])), dist_m(p["lat"], p["lon"], q["lat"], q["lon"])))
        if cands and not p["coords_suspect"] or (cands and w & words(cands[0]["name"])):
            q = cands[0]
            if q["car_rate_return"] is None:
                q["car_rate_single"], q["car_rate_return"] = p["car_rate_single"], p["car_rate_return"]
                q["effective_from"] = p["effective_from"]
            q["sources"].append(f"NHAI TIS map ({NHAI_DATE}): rates")
            matched += 1
        else:
            kept.append(p)
    return kept, matched


def load_osm():
    files = sorted(glob.glob(os.path.join(RAW, "osm_toll_booths_*.json")))
    pts, seen = [], set()   # all OSM files are merged; duplicates are dropped by OSM id
    for fn in files:
        for e in json.load(open(fn, encoding="utf-8"))["elements"]:
            key = (e["type"], e["id"])
            if key in seen:
                continue
            seen.add(key)
            lat = e.get("lat", e.get("center", {}).get("lat"))
            lon = e.get("lon", e.get("center", {}).get("lon"))
            if lat is None or not in_india(lat, lon):
                continue
            pts.append({"osm": f"{e['type']}/{e['id']}", "lat": lat, "lon": lon, "tags": e.get("tags", {})})
    # Greedy clustering on a coarse grid (fast enough for tens of thousands of points)
    grid, clusters = {}, []
    for p in pts:
        gx, gy = int(p["lat"] * 100), int(p["lon"] * 100)
        hit = None
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for c in grid.get((gx + dx, gy + dy), []):
                    if dist_m(p["lat"], p["lon"], c["lat"], c["lon"]) < OSM_CLUSTER_M:
                        hit = c; break
                if hit: break
            if hit: break
        if hit:
            hit["members"].append(p)
        else:
            c = {"lat": p["lat"], "lon": p["lon"], "members": [p]}
            clusters.append(c); grid.setdefault((gx, gy), []).append(c)
    return clusters, [os.path.basename(f) for f in files]


def check_states(plazas, missing):
    """Set each plaza's state from its coordinates (nearest GeoNames place). If an official list names a
    real state and the location is well inside a DIFFERENT state, the coordinates are wrong: take the plaza
    off the map (a wrong dot is worse than no dot) and add it to covered_without_location if covered."""
    import io, zipfile
    names = {}
    for r in csv.reader(open(os.path.join(RAW, "geonames-admin1CodesASCII.txt"), encoding="utf-8"), delimiter="\t"):
        if r[0].startswith("IN."): names[r[0][3:]] = r[1]
    canon = lambda s: {"orissa": "odisha", "uttaranchal": "uttarakhand", "pondicherry": "puducherry",
                       "jammukashmir": "jammuandkashmir", "newdelhi": "delhi", "nctofdelhi": "delhi"}.get(
                       re.sub(r"[^a-z]", "", (s or "").lower()).replace("and", "and"), re.sub(r"[^a-z]", "", (s or "").lower()))
    real = {canon(v) for v in names.values()}
    grid = {}
    with zipfile.ZipFile(os.path.join(RAW, "geonames-IN.zip")) as z:
        for line in io.TextIOWrapper(z.open("IN.txt"), encoding="utf-8"):
            r = line.split("\t")
            if r[6] == "P":
                grid.setdefault((int(float(r[4]) * 10), int(float(r[5]) * 10)), []).append((float(r[4]), float(r[5]), names.get(r[10], "")))
    def at(la, lo):
        best = None
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for q in grid.get((int(la * 10) + dx, int(lo * 10) + dy), []):
                    d = dist_m(la, lo, q[0], q[1])
                    if best is None or d < best[0]: best = (d, q[2])
        return best[1] if best and best[0] < 15000 else ""
    keep, moved = [], []
    for p in plazas:
        geo = at(p["lat"], p["lon"])
        listed = canon(p.get("state"))
        if geo and listed in real and canon(geo) != listed:
            around = [at(p["lat"] + d1, p["lon"] + d2) for d1, d2 in ((0.2, 0), (-0.2, 0), (0, 0.2), (0, -0.2))]
            if all(a and canon(a) != listed for a in around):          # not a border plaza
                moved.append(f'{p["name"]} ({p.get("state")} → at {geo})')
                if p["pass_covered"] is True and p.get("code"):
                    missing.append({"s_no": "", "code": p["code"], "name": p["name"], "state": p.get("state"),
                                    "district": "", "section": "coordinates point to " + geo, "nh": (p.get("highway") or "").replace("NH ", "")})
                continue
        if geo: p["state"] = geo
        keep.append(p)
    return keep, moved


def main():
    ihmcl = load_ihmcl()
    ocity = load_opencity()
    npci = load_npci(ihmcl, ocity)
    nhai = load_nhai()
    placed, missing = place_missing_ihmcl(ihmcl, npci, nhai)
    nhai_only, nhai_matched = merge_nhai(npci, nhai)
    listed = npci + placed + nhai_only
    # Car rates: 2024 OpenCity (by plaza code) replace the 2022 NHAI ones.
    ocity_rates = 0
    for p in listed:
        o = ocity.get(p.get("code") or "")
        if o and o["car_sj"]:
            p["car_rate_single"], p["car_rate_return"], p["effective_from"] = o["car_sj"], o["car_rj"], "2024"
            p["sources"].append(f"{OPENCITY}: car rate")
            ocity_rates += 1
    print(f"opencity={len(ocity)} rates_from_opencity={ocity_rates}")
    grid = {}
    for p in listed:
        grid.setdefault((int(p["lat"] * 100), int(p["lon"] * 100)), []).append(p)

    clusters, osm_files = load_osm()
    extra, osm_matched, osm_placed = [], 0, 0
    for c in clusters:
        tags = [m["tags"] for m in c["members"]]
        name = next((t["name"] for t in tags if t.get("name")), None)
        operator = next((t["operator"] for t in tags if t.get("operator")), None)
        osm_ids = [m["osm"] for m in c["members"]]
        gx, gy = int(c["lat"] * 100), int(c["lon"] * 100)
        w = words(name)
        # Same plaza if within 600 m, or within 2 km when the names share a distinctive word
        # (NPCI coordinates are sometimes a little off).
        cands = [p for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2) for p in grid.get((gx + dx, gy + dy), [])
                 if not p.get("osm_ids") and (dist_m(p["lat"], p["lon"], c["lat"], c["lon"]) < OSM_MATCH_M or
                    (w & words(p["name"]) and dist_m(p["lat"], p["lon"], c["lat"], c["lon"]) < 2000))]
        cands.sort(key=lambda p: (not (w & words(p["name"])), p["coords_suspect"],
                                  dist_m(p["lat"], p["lon"], c["lat"], c["lon"])))
        if cands:
            near = cands[0]
            near["osm_ids"] = osm_ids
            near["sources"].append("OpenStreetMap")
            osm_matched += 1
            continue
        # A named OSM booth may be one of the official NH plazas we could not locate.
        if w:
            hits = [ih for ih in missing if words(ih["name"]) and words(ih["name"]) <= w]
            if len(hits) == 1:
                ih = hits[0]; missing.remove(ih)
                extra.append({
                    "id": f"netc-{ih['code']}", "code": ih["code"], "name": ih["name"],
                    "lat": round(c["lat"], 6), "lon": round(c["lon"], 6), "state": ih["state"] or None,
                    "highway": f"NH {ih['nh']}" if ih["nh"] else None,
                    "operator": operator, "operator_type": "national", "pass_covered": True,
                    "coverage_reason": f"IHMCL NH fee plaza list ({IHMCL_DATE}), NH {ih['nh']}",
                    "car_rate_single": None, "car_rate_return": None, "effective_from": None,
                    "sources": [f"IHMCL NH Fee Plazas ({IHMCL_DATE})", "OpenStreetMap: location by name match"],
                    "osm_ids": osm_ids, "confidence": "unconfirmed", "coords_suspect": False,
                    "last_checked": IHMCL_DATE,
                })
                osm_placed += 1
                continue
        # The IHMCL list is the complete list of NH fee plazas (where the pass is valid).
        # A physical toll booth that matches none of them is a toll you pay.
        is_state = bool(operator and STATE_OPERATORS.search(operator))
        extra.append({
            "id": "osm-" + osm_ids[0].replace("/", "-"),
            "name": name or "Toll booth (unnamed in OpenStreetMap)",
            "lat": round(c["lat"], 6), "lon": round(c["lon"], 6),
            "state": None,
            "operator": operator,
            "operator_type": "state" if is_state else "non-NH",
            "pass_covered": False,
            "coverage_reason": (f"Toll booth in OpenStreetMap" + (f" (operator: {operator})" if operator else "") +
                                f"; not on the official NH fee plaza list ({IHMCL_DATE}), so the pass does not apply"),
            "car_rate_single": None, "car_rate_return": None, "effective_from": None,
            "sources": ["OpenStreetMap"],
            "osm_ids": osm_ids,
            "confidence": "unconfirmed",
            "coords_suspect": False,
            "last_checked": datetime.date.today().isoformat(),
        })

    plazas = [p for p in listed + extra if in_india(p["lat"], p["lon"])]
    plazas, moved = check_states(plazas, missing)
    print(f"state check: {len(moved)} official plazas taken off the map (location is in another state): "
          + "; ".join(moved[:12]))
    with open(os.path.join(ROOT, "data", "processed", "covered_without_location.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=list(next(iter(ihmcl.values())).keys()))
        wr.writeheader(); wr.writerows(missing)
    out = {
        "generated": datetime.date.today().isoformat(),
        "notes": "All entries unconfirmed. Coverage from IHMCL NH Fee Plazas list (Jul 2026), joined to NPCI "
                 "Plaza Master (May 2025) by NETC plaza code for location. Rates are NHAI 2022 and only indicative.",
        "sources": {
            "ihmcl": f"IHMCL National Highway (NH) Fee Plazas, {IHMCL_DATE} (ihmcl.co.in/nh-toll-plaza)",
            "npci": f"NETC Plaza Master, {NPCI_DATE} (netc.org.in, saved from browser)",
            "nhai": f"NHAI TIS toll plaza map, {NHAI_DATE} snapshot via github.com/geohacker/toll-plazas-india",
            "osm": "© OpenStreetMap contributors, ODbL (" + ", ".join(osm_files) + ")"},
        "plazas": plazas,
    }
    for fn in OUT:
        with open(fn, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    cnt = lambda v: sum(1 for p in plazas if p["pass_covered"] is v)
    print(f"ihmcl={len(ihmcl)} placed_by_2022_name={len(placed)} placed_by_osm_name={osm_placed} "
          f"covered_without_location={len(missing)}")
    print(f"npci={len(npci)} nhai2022_matched={nhai_matched} nhai2022_only={len(nhai_only)} "
          f"osm_clusters={len(clusters)} osm_matched={osm_matched} osm_only={len(extra)}")
    print(f"TOTAL={len(plazas)} covered={cnt(True)} not_covered={cnt(False)} unknown={cnt(None)} "
          f"with_rate={sum(1 for p in plazas if p['car_rate_return'])} osm_files={osm_files}")


if __name__ == "__main__":
    main()
