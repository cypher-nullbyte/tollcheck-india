#!/usr/bin/env python3
"""Route tests: open the app (local server must run on :8765) in headless Chrome for known trips and
check the answer. Add a case whenever a real trip shows a mistake.
Usage: python3 scripts/test_routes.py
"""
import html, os, re, shutil, subprocess, sys, tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = "http://127.0.0.1:8765/?lang=en"
# (from, to, must appear in the best route card or status line, must NOT appear there)
CASES = [
    ("Deoband", "Hapur", ["1 you pay", "1 covered by pass", "Rohana Khurd", "Sivaya"], []),
    ("Saharanpur", "Muzaffarnagar", ["you pay", "Rohana Khurd"], []),
    ("Delhi", "Jaipur", ["covered by pass"], ["you pay", "unknown"]),       # both roads: every toll covered (Nov 2026 data)
    ("Mumbai", "Pune", ["you pay"], []),
    ("Panyali Kasimpur", "Deoband", [], ["route(s) found"]),          # unknown village: must not guess
    ("ladwa charthawal", "Deoband", ["Ladwa, Muzaffarnagar"], []),     # status line names the right Ladwa
]


def run(frm, to):
    prof = tempfile.mkdtemp()
    try:
        out = subprocess.run([CHROME, "--headless=new", "--disable-gpu", f"--user-data-dir={prof}",
                              "--virtual-time-budget=40000", "--dump-dom", f"{BASE}&from={frm}&to={to}"],
                             capture_output=True, text=True, timeout=120).stdout
    finally:
        shutil.rmtree(prof, ignore_errors=True)
    text = lambda h: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h)))
    cards = re.findall(r'(?s)<div class="route[^"]*" data-i="\d">(.*?)<div class="actions"', out)
    status = re.search(r'<p id="status"[^>]*>(.*?)</p>', out, re.S)
    return (text(cards[0]) if cards else ""), text(out), (text(status.group(1)) if status else "")


def main():
    fails = 0
    for frm, to, must, mustnot in CASES:
        best, page, status = run(frm, to)
        hay = best + " " + status
        miss = [m for m in must if m not in hay]
        bad = [m for m in mustnot if m in (best + " " + status)]
        ok = not miss and not bad
        fails += not ok
        print(f"{'PASS' if ok else 'FAIL'}  {frm} → {to}" + (f"   missing: {miss}" if miss else "") + (f"   unexpected: {bad}" if bad else ""))
        if not ok: print("      best card:", best[:300], "| status:", status[:160])
    print(f"{len(CASES) - fails}/{len(CASES)} passed")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
