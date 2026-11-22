#!/usr/bin/env python3
"""Check that the app's Google Maps links make Google follow the app's road, for many trips.

For each trip: open the app (local server on :8765) in headless Chrome, read every route card
(km + main roads) and its Google Maps link, open the link in headless Chrome, read Google's
"via …" and km, and compare. A route matches if Google's km is within 10% (or 12 km) of ours.
Prints one line per route and a summary. Needs Google Chrome; slow (about 30 s per route).

Usage: python3 scripts/check_google_match.py [--trips "A:B,C:D"]
"""
import html, re, shutil, subprocess, sys, tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
APP = "http://127.0.0.1:8765/?lang=en"
TRIPS = ["Mumbai:Pune", "Bengaluru:Mysuru", "Chennai:Vellore", "Lucknow:Kanpur", "Kolkata:Durgapur",
         "Ahmedabad:Vadodara", "Delhi:Agra", "Hyderabad:Vijayawada", "Jaipur:Ajmer", "Indore:Bhopal",
         "Pune:Nashik", "Deoband:Hapur", "Hapur:Mathura", "Delhi:Jaipur"]


def dump(url, budget=30000):
    prof = tempfile.mkdtemp()
    try:
        return subprocess.run([CHROME, "--headless=new", "--disable-gpu", f"--user-data-dir={prof}",
                               "--window-size=1280,900", f"--virtual-time-budget={budget}", "--dump-dom", url],
                              capture_output=True, text=True, timeout=150).stdout
    except subprocess.TimeoutExpired:
        return ""
    finally:
        shutil.rmtree(prof, ignore_errors=True)


def text(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def main():
    trips = TRIPS
    if "--trips" in sys.argv:
        trips = sys.argv[sys.argv.index("--trips") + 1].split(",")
    total = ok = 0
    for trip in trips:
        a, b = trip.split(":")
        page = dump(f"{APP}&from={a}&to={b}", 40000)
        cards = re.split(r'<div class="route[^"]*" data-i="\d">', page)[1:]
        if cards: cards[-1] = cards[-1].split('<div class="legend"')[0]
        if not cards:
            print(f"{trip}: no routes"); continue
        for c in cards:
            name = (re.search(r"(Route [A-D])", text(c)) or [None, "?"])[1]
            km = re.search(r"(\d+) km", text(c))
            roads = (re.search(r"Via (.*?) ·", text(c)) or [None, "?"])[1]
            link = re.search(r'href="(https://www\.google\.com/maps/dir/[^"]*)"', c)
            if not (km and link):
                continue
            ours = int(km.group(1)); url = html.unescape(link.group(1))
            g = re.sub(r"[\ue000-\uf8ff]", " ", text(re.sub(r"(?s)<(script|style)[^>]*>.*?</\1>", "", dump(url, 25000))))
            gm = re.search(r"(\d[\d,]*(?:\.\d+)?) km via (.{3,70}?)(?= Fastest| This | Best| Due | Avoid| Usual| Slower| Faster| Includes|  |$)", g)
            total += 1
            if not gm:
                print(f"{trip} {name}: ours {ours} km via {roads} | Google: could not read"); continue
            gkm = round(float(gm.group(1).replace(",", ""))); gvia = gm.group(2); match = abs(gkm - ours) <= max(12, ours * 0.10)   # same road; town start points differ a little
            ok += match
            print(f"{'OK  ' if match else 'DIFF'} {trip} {name}: ours {ours} km via {roads} | Google {gkm} km via {gvia.strip()} | stops {url.split('waypoints=')[1].count('%7C') + 1 if 'waypoints=' in url else 0}")
    print(f"\n{ok}/{total} routes: Google follows our road (km within 10% or 12 km)")


if __name__ == "__main__":
    main()
