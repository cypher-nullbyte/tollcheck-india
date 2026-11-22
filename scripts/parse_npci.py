#!/usr/bin/env python3
"""Parse an NPCI NETC "Plaza Master" PDF into CSV.

Needs `pdftotext` (poppler). Usage:
  python3 scripts/parse_npci.py data/raw/npci-plaza-master-2025-05.pdf data/raw/npci_plaza_master_2025-05.csv

The PDF is an Excel sheet printed to PDF. Each row's cells wrap over several text lines, and
all wrapped lines of a row sit ABOVE or ON the line that holds the plaza code (the "anchor").
So a record = the lines after the previous anchor, up to and including its own anchor.
Each wrapped piece is assigned to the column whose anchor-line text it lines up with.
"""
import csv, re, subprocess, sys

ANCHOR = re.compile(
    r"^(?P<code>\d{4,7})\s+(?P<name>.*?)\s+(?P<ctype>PF|Conc\.?)\s+(?P<ptype>TOLL|PARKING|\S+)\s+"
    r"(?P<sub>NATIONAL|STATE)\b(?P<rest>.*)$")
HEADER = re.compile(r"Plaza Name|Geo Codes|^Code\b|Conc\.\s+Plaza\s+Plaza Sub|Type Type")


def chunks(line):
    """Text pieces separated by 2+ spaces, with their (start, end) character columns."""
    return [(m.start(), m.end(), m.group()) for m in re.finditer(r"\S+(?: \S+)*", line)]


def parse(text):
    rows, pending, unparsed = [], [], []
    for line in text.splitlines():
        if not line.strip() or HEADER.search(line) or line.startswith("\f"):
            if line.startswith("\f"):
                line = line[1:]
                if not line.strip() or HEADER.search(line):
                    continue
            else:
                continue
        m = ANCHOR.match(line)
        if not m:
            pending.append(line)
            continue
        # Column spans on the anchor line: name, then each chunk of the rest.
        cols = {"name": [m.start("name"), m.end("name")]}
        rest_chunks = chunks(line[m.start("rest"):])
        off = m.start("rest")
        # rest = [state, city, concessionaire..., geo]; geo is always the last chunk.
        names = ["state", "city", "conc"]
        rc = [(s + off, e + off, t) for s, e, t in rest_chunks]
        geo_span = rc[-1][:2] if rc else (len(line), len(line))
        mids = rc[:-1]
        for i, (s, e, _) in enumerate(mids):
            key = names[min(i, 2)]
            if key in cols:
                cols[key][1] = e
            else:
                cols[key] = [s, e]
        cols["geo"] = list(geo_span)
        parts = {k: [] for k in cols}

        def assign(ln):
            for s, e, t in chunks(ln):
                # Pure numeric pieces at the far right are geo fragments.
                if re.fullmatch(r"[\d.,\- ]+", t) and s >= cols.get("conc", cols["geo"])[0]:
                    parts["geo"].append(t); continue
                mid = (s + e) / 2
                best = min(cols, key=lambda k: 0 if cols[k][0] - 2 <= mid <= cols[k][1] + 2
                           else min(abs(mid - cols[k][0]), abs(mid - cols[k][1])))
                parts[best].append(t)

        for ln in pending:
            assign(ln)
        pending = []
        # Anchor line itself
        parts["name"].append(m.group("name"))
        for s, e, t in rc[:-1]:
            mid = (s + e) / 2
            best = min((k for k in cols if k not in ("name", "geo")),
                       key=lambda k: 0 if cols[k][0] - 2 <= mid <= cols[k][1] + 2 else min(abs(mid - cols[k][0]), abs(mid - cols[k][1])),
                       default="conc")
            parts[best].append(t)
        if rc:
            parts["geo"].append(rc[-1][2])

        # Wrapped concessionaire text often lands in the geo column; keep only digits, dots, commas.
        geo_raw = "".join(parts["geo"])
        geo = re.sub(r"[^0-9.,]", "", geo_raw)
        lat = lon = None
        mm = re.fullmatch(r"(\d{1,2}\.\d+),(\d{2,3}\.\d+),?", geo)
        if mm:
            lat, lon = float(mm.group(1)), float(mm.group(2))
        name = " ".join(" ".join(parts["name"]).split())
        rows.append({
            "code": m.group("code"), "name": name,
            "conc_type": m.group("ctype"), "plaza_type": m.group("ptype"), "sub_type": m.group("sub"),
            "state": " ".join(" ".join(parts.get("state", [])).replace("Maharashtr a", "Maharashtra").split()),
            "city": " ".join(" ".join(parts.get("city", [])).split()),
            "concessionaire": " ".join(" ".join(parts.get("conc", [])).split()),
            "lat": lat, "lon": lon, "geo_raw": geo_raw,
        })
    return rows


def main():
    pdf, out = sys.argv[1], sys.argv[2]
    text = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    rows = parse(text)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    bad = [r for r in rows if r["lat"] is None or not (6 <= r["lat"] <= 37 and 68 <= r["lon"] <= 98)]
    print(f"rows={len(rows)} national={sum(r['sub_type']=='NATIONAL' for r in rows)} "
          f"state={sum(r['sub_type']=='STATE' for r in rows)} bad_coords={len(bad)} -> {out}")


if __name__ == "__main__":
    main()
