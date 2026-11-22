# TollCheck India

**Free · no sign-up · v1.0** · https://cyphernullbyte.com/tollcheck-india/

For Indian highways: see which tolls on your trip the **FASTag Annual Pass** covers, and where you
still pay.

The Annual Pass is valid only at national highway (NH) and national expressway toll plazas. State,
city and private tolls still charge your FASTag. TollCheck India shows every toll on your route and
marks each one:

- 🟢 **Covered by the pass:** national highway / expressway toll
- 🔴 **You pay:** state, city or private toll
- ⚪ **Unknown:** not yet confirmed

## Features

- Compare routes: tolls on each, Annual Pass trips used, extra cost where known
- Closed expressways counted correctly (one entry + exit = one trip)
- Search towns and villages, even with typos
- Open your route in **Google Maps** or **Apple Maps** to drive
- Save routes, share a route summary on WhatsApp
- 10 languages: English, हिंदी, ગુજરાતી, मराठी, বাংলা, ਪੰਜਾਬੀ, ಕನ್ನಡ, தமிழ், తెలుగు, മലയാളം
- Installs like an app on your phone; works on slow mobile data

**For planning only.** Drive with Google Maps or Apple Maps: they show live traffic, road closures
and construction. Toll data can be out of date; check important tolls in the official Rajmargyatra app.

## Data

Built from official and open sources: IHMCL's National Highway fee plaza list, the NETC FASTag
plaza master, NHAI toll data, OpenCity, OpenStreetMap and GeoNames. Full credits and licences:
[`DATA_SOURCES.md`](DATA_SOURCES.md).

Not affiliated with NHAI, IHMCL, NPCI or any government body.

## Run locally

```bash
python3 scripts/serve.py          # → http://127.0.0.1:8765
```

Rebuild the data: `scripts/update_data.sh` (parsers need `pdftotext` from poppler).
Checks: `python3 scripts/validate_data.py`, `python3 scripts/check_lang.py`, `python3 scripts/test_routes.py`.

## Feedback

Found a wrong toll or a missing village? Open an issue on this repository.

## Licence

Code: MIT (see [`LICENSE`](LICENSE)). Data: see [`DATA_SOURCES.md`](DATA_SOURCES.md).
