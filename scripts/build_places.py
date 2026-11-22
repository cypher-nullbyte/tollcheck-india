#!/usr/bin/env python3
"""Build the offline village/town search index from GeoNames India (CC BY 4.0).

Inputs (data/raw/, from https://download.geonames.org/export/dump/):
  geonames-IN.zip, geonames-admin1CodesASCII.txt (states), geonames-admin2Codes.txt (districts)
Output:
  web/places/<xx>.json  one small file per first two letters of the (ASCII, lower-case) name,
  so the app downloads only the part it needs while you type.
  Row: [name, lat, lon, district_idx, state_idx, population, also_known_as]
  web/places/_meta.json  district + state name tables, counts, source + licence.

Standard library only:  python3 scripts/build_places.py
"""
import csv, io, json, os, re, unicodedata, zipfile, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "web", "places")


def ascii_lower(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower()).strip()


def clean_district(s):
    return re.sub(r"^(District|Zila)\s+", "", s).strip()


def main():
    states = {}
    for row in csv.reader(open(os.path.join(RAW, "geonames-admin1CodesASCII.txt"), encoding="utf-8"), delimiter="\t"):
        if row[0].startswith("IN."):
            states[row[0][3:]] = row[1]
    districts = {}
    for row in csv.reader(open(os.path.join(RAW, "geonames-admin2Codes.txt"), encoding="utf-8"), delimiter="\t"):
        if row[0].startswith("IN."):
            districts[row[0][3:]] = clean_district(row[1])

    dist_names, dist_idx, state_names, state_idx = [], {}, [], {}
    def idx(table, lookup, name):
        if not name:
            return -1
        if name not in lookup:
            lookup[name] = len(table); table.append(name)
        return lookup[name]

    shards = collections.defaultdict(list)
    n = 0
    with zipfile.ZipFile(os.path.join(RAW, "geonames-IN.zip")) as z:
        for line in io.TextIOWrapper(z.open("IN.txt"), encoding="utf-8"):
            r = line.rstrip("\n").split("\t")
            if r[6] != "P" or r[7] in ("PPLH", "PPLQ", "PPLW"):     # populated places; skip historical/abandoned/destroyed
                continue
            name = r[1]
            lat, lon = round(float(r[4]), 5), round(float(r[5]), 5)
            st = states.get(r[10], "")
            di = districts.get(f"{r[10]}.{r[11]}", "")
            pop = int(r[14] or 0)
            alts = sorted({a for a in r[3].split(",") if a and re.fullmatch(r"[A-Za-z .'-]+", a) and ascii_lower(a) != ascii_lower(name)})[:4]
            row = [name, lat, lon, idx(dist_names, dist_idx, di), idx(state_names, state_idx, st), pop, alts]
            keys = {ascii_lower(name)[:2]} | {ascii_lower(a)[:2] for a in alts}
            for k in keys:
                if len(k) == 2 and k.isalnum():
                    shards[k].append(row)
            n += 1

    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    sizes = {}
    for k, rows in shards.items():
        rows.sort(key=lambda x: -x[5])               # bigger places first
        with open(os.path.join(OUT, f"{k}.json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
        sizes[k] = os.path.getsize(os.path.join(OUT, f"{k}.json"))
    meta = {"source": "GeoNames India (download.geonames.org/export/dump/IN.zip)", "licence": "CC BY 4.0",
            "places": n, "districts": dist_names, "states": state_names}
    with open(os.path.join(OUT, "_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))
    tot = sum(sizes.values())
    big = sorted(sizes.items(), key=lambda kv: -kv[1])[:3]
    print(f"places={n} shards={len(sizes)} total={tot/1e6:.1f} MB avg={tot/len(sizes)/1e3:.0f} KB "
          f"largest={[(k, round(v/1e3)) for k, v in big]} KB districts={len(dist_names)} states={len(state_names)}")


if __name__ == "__main__":
    main()
