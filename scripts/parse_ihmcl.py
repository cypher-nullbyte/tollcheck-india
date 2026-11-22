#!/usr/bin/env python3
"""Parse IHMCL's "National Highway (NH) Fee Plazas" PDF into CSV.

Source page: https://ihmcl.co.in/nh-toll-plaza/  (link "National Highway-Fee Plazas")
This is the official list of NH fee plazas, i.e. where the FASTag Annual Pass is valid.
It has no coordinates; join to the NPCI Plaza Master by NETC plaza code for those.

Needs `pdftotext` (poppler). Usage:
  python3 scripts/parse_ihmcl.py data/raw/ihmcl-nh-fee-plazas-2026-07.pdf data/raw/ihmcl_nh_fee_plazas_2026-07.csv
"""
import csv, re, subprocess, sys

ROW = re.compile(r"^\s*(?P<sno>\d{1,4})\s+(?:(?P<code>\d{4,7})\s+)?(?P<rest>\S.*)$")


def main():
    pdf, out = sys.argv[1], sys.argv[2]
    text = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    rows, last_sno = [], 0
    for line in text.splitlines():
        m = ROW.match(line)
        if not m:
            continue
        sno = int(m.group("sno"))
        if sno != last_sno + 1:      # skip stray numeric lines; rows are numbered 1..N
            continue
        cells = re.split(r"\s{2,}", m.group("rest").strip())
        if len(cells) < 3:
            continue
        last_sno = sno
        rows.append({
            "s_no": sno,
            "code": m.group("code") or "",
            "name": cells[0],
            "state": cells[1].title(),
            "district": cells[2],
            "section": cells[3] if len(cells) > 3 else "",
            "nh": cells[4] if len(cells) > 4 else "",
        })
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"rows={len(rows)} last_s_no={last_sno} with_code={sum(1 for r in rows if r['code'])} -> {out}")


if __name__ == "__main__":
    main()
