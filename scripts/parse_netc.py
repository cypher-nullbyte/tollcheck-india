#!/usr/bin/env python3
"""Parse a NETC/NPCI "Plaza Master" PDF (2026 layout, Excel export) into CSV.

Source: https://www.netc.org.in (Plaza_Master_<Mon><YY>_*.pdf). netc.org.in blocks scripted
downloads, so the PDF is saved by hand from a browser into data/raw/.

In this layout every cell is bottom-aligned: a long cell (name, operator, coordinates) wraps
UPWARD from the line that holds the plaza code. We therefore work on word positions
(pdftotext -bbox): each word belongs to the first plaza-code line at or below it on its page, and
to the column whose header it sits under.

Needs `pdftotext` (poppler). Usage:
  python3 scripts/parse_netc.py data/raw/npci-plaza-master-2026-09.pdf data/raw/netc_plaza_master_2026-09.csv
"""
import csv, html, re, subprocess, sys

WORD = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>')


def pages(pdf):
    out = subprocess.run(["pdftotext", "-bbox", pdf, "-"], capture_output=True, text=True, check=True).stdout
    for page in out.split("<page ")[1:]:
        yield [(float(a), float(b), float(c), float(d), html.unescape(t)) for a, b, c, d, t in WORD.findall(page)]


def header_cols(words):
    """Column left edges from the header row (the repeated title row at the top of each page)."""
    top = min((w[1] for w in words if w[4] in ("Code", "Geo", "City")), default=None)
    if top is None:
        return None
    hdr = [w for w in words if abs(w[1] - top) < 25]
    x = lambda t: [w[0] for w in hdr if w[4] == t]
    conc = sorted(x("Concessio"))
    cols = {
        "name": min(x("Name") or [100]) - 25,      # "Plaza Name" header: "Plaza" sits ~25pt left of "Name"
        "ctype": conc[0] if conc else 165,
        "state": min(x("State") + x("Sate") or [325]),
        "city": min(x("City") or [380]),
        "conc": conc[-1] if len(conc) > 1 else 420,
        "geo": min(x("Geo") or [480]),
    }
    return cols, top + 25


def parse(pdf):
    rows, cols = [], None
    for words in pages(pdf):
        hc = header_cols(words)
        if hc:
            cols, body_top = hc
        else:
            body_top = 0
        if cols is None:
            continue
        body = [w for w in words if w[1] > body_top]
        anchors = [w for w in body if re.fullmatch(r"\d{4,7}", w[4]) and w[0] < cols["name"]]
        if not anchors:
            continue
        recs = {id(a): {"a": a, "words": []} for a in anchors}
        # Cells are bottom-aligned: a row's text ends on the line holding its plaza code and wraps
        # upward. So a word belongs to the first plaza-code line at or below it.
        anchors.sort(key=lambda a: a[3])
        for w in body:
            if w in anchors:
                continue
            below = [a for a in anchors if a[3] >= w[3] - 2]
            if below:
                recs[id(below[0])]["words"].append(w)
        for r in recs.values():
            a = r["a"]
            parts = {k: [] for k in ("name", "ctype", "mid", "state", "city", "conc", "geo")}
            for w in sorted(r["words"], key=lambda w: (round(w[1]), w[0])):
                x0, x1, t = w[0], w[2], w[4]
                if x0 >= cols["geo"] - 4:
                    parts["geo"].append(t)
                elif x0 >= cols["conc"] - 4:
                    m = re.match(r"^(.*?)(\d[\d.,]*)$", t)
                    if m and x1 > cols["geo"]:        # "Isolux74.780202": operator text glued to coordinates
                        if m.group(1): parts["conc"].append(m.group(1))
                        parts["geo"].append(m.group(2))
                    else:
                        parts["conc"].append(t)
                elif x0 >= cols["city"] - 4:
                    parts["city"].append(t)
                elif x0 >= cols["state"] - 4:
                    parts["state"].append(t)
                elif x0 >= cols["ctype"] - 4:
                    parts["mid"].append(t)
                else:
                    parts["name"].append(t)
            mid = " ".join(parts["mid"])
            sub = "NATIONAL" if "NATIONAL" in mid else "STATE" if "STATE" in mid else ""
            ptype = "TOLL" if "TOLL" in mid else "PARKING" if "PARKING" in mid else ""
            ctype = "PF" if re.search(r"\bPF\b", mid) else "Conc." if "Conc" in mid else ""
            geo_raw = "".join(parts["geo"])
            geo = re.sub(r"[^0-9.,]", "", geo_raw)
            # trailing dots/commas come from operator text in the same cell ("…77.710995TollwayLtd.")
            m = re.fullmatch(r"(\d{1,2}\.\d+),(\d{2,3}\.\d+)[.,]*", geo)
            lat, lon = (float(m.group(1)), float(m.group(2))) if m else (None, None)
            if lat is not None and not (6 <= lat <= 37.5 and 68 <= lon <= 98):
                lat = lon = None
            rows.append({
                "code": a[4], "name": " ".join(parts["name"]),
                "conc_type": ctype, "plaza_type": ptype, "sub_type": sub,
                "state": "".join(parts["state"]) if len(parts["state"]) > 1 and len(parts["state"][0]) <= 9 and parts["state"][0][-1:].islower() is False else " ".join(parts["state"]),
                "city": " ".join(parts["city"]),
                "concessionaire": " ".join(parts["conc"]),
                "lat": lat, "lon": lon, "geo_raw": geo_raw,
            })
    return rows


def main():
    pdf, out = sys.argv[1], sys.argv[2]
    rows = parse(pdf)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    n = len(rows)
    print(f"rows={n} toll={sum(r['plaza_type']=='TOLL' for r in rows)} "
          f"national={sum(r['sub_type']=='NATIONAL' for r in rows)} state={sum(r['sub_type']=='STATE' for r in rows)} "
          f"no_subtype={sum(not r['sub_type'] for r in rows)} with_coords={sum(r['lat'] is not None for r in rows)} -> {out}")


if __name__ == "__main__":
    main()
