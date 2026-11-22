#!/usr/bin/env python3
"""Check translation files web/lang/<code>.json against the English master web/lang/en.json.

Checks, per language:
  1. same keys as English (none missing, none extra)
  2. same {placeholders} in every text
  3. same HTML tags (<b>, <strong>, …) in the same order
  4. written in the right script (e.g. Tamil letters for Tamil): at least 60% of letters in that script
     for texts with 12+ letters
  5. not left in English (identical to English) except brand/route names
It cannot judge wording: a native speaker should still read each language once.

Usage: python3 scripts/check_lang.py [code ...]    (default: every file in web/lang/ except en)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG_DIR = os.path.join(ROOT, "web", "lang")
SCRIPTS = {  # Unicode block per language
    "hi": (0x0900, 0x097F), "mr": (0x0900, 0x097F), "gu": (0x0A80, 0x0AFF), "bn": (0x0980, 0x09FF),
    "pa": (0x0A00, 0x0A7F), "kn": (0x0C80, 0x0CFF), "ta": (0x0B80, 0x0BFF), "te": (0x0C00, 0x0C7F),
    "ml": (0x0D00, 0x0D7F),
}
SAME_OK = {"googleMaps", "appleMaps", "h", "min", "title"}   # may legitimately stay as in English
# Phone menu labels (Install app, Add to Home Screen, Safari) stay in English on purpose: that is what the phone shows.


def check(code, en):
    path = os.path.join(LANG_DIR, f"{code}.json")
    try:
        tr = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        return [f"cannot read: {e}"]
    errs = []
    missing, extra = sorted(set(en) - set(tr)), sorted(set(tr) - set(en))
    if missing: errs.append(f"missing keys: {missing}")
    if extra: errs.append(f"extra keys: {extra}")
    lo, hi = SCRIPTS.get(code, (0, 0x10FFFF))
    for k, ev in en.items():
        v = tr.get(k)
        if not isinstance(v, str) or not v.strip():
            if k in tr: errs.append(f"{k}: empty"); continue
            continue
        if sorted(re.findall(r"\{\w+\}", ev)) != sorted(re.findall(r"\{\w+\}", v)):
            errs.append(f"{k}: placeholders differ: en={re.findall(r'{\w+}', ev)} {code}={re.findall(r'{\w+}', v)}")
        if re.findall(r"</?\w+", ev) != re.findall(r"</?\w+", v):
            errs.append(f"{k}: HTML tags differ")
        letters = [ch for ch in re.sub(r"\{\w+\}|<[^>]+>|FASTag|Google|Apple|Maps|NHAI|IHMCL|NETC|OpenStreetMap|GeoNames|Rajmargyatra|FAQ|WhatsApp|km|iPhone|Safari|Add to Home [Ss]creen|Install app|TollCheck India", "", v) if ch.isalpha()]
        if len(letters) >= 12 and code in SCRIPTS:
            share = sum(lo <= ord(ch) <= hi for ch in letters) / len(letters)
            if share < 0.6: errs.append(f"{k}: only {share:.0%} in the {code} script")
        if v == ev and k not in SAME_OK and len(re.sub(r"[^A-Za-z]", "", ev)) > 3:
            errs.append(f"{k}: still English")
    return errs


def main():
    en = json.load(open(os.path.join(LANG_DIR, "en.json"), encoding="utf-8"))
    codes = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(LANG_DIR) if f.endswith(".json") and f != "en.json")
    bad = 0
    for code in codes:
        errs = check(code, en)
        print(f"{code}: {'OK' if not errs else f'{len(errs)} problem(s)'}")
        for e in errs[:30]: print("   -", e)
        bad += bool(errs)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
