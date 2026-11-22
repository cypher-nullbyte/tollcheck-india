# Data sources and credits

TollCheck India combines the sources below. Original files are in `data/raw/`; the merged result is
`data/processed/plazas.json` (copied to `web/plazas.json`). Data as of November 2026.

| Source | Publisher | Link | Used for | Licence / terms |
|---|---|---|---|---|
| National Highway (NH) Fee Plazas, July 2026 | IHMCL | https://ihmcl.co.in/nh-toll-plaza/ | Which plazas the Annual Pass covers | Government publication |
| NH Fee Plazas, August 2025 | IHMCL | https://ihmcl.co.in/wp-content/uploads/2025/08/NH-Toll-Plaza-.pdf | Changes over time | Government publication |
| NETC Plaza Master, September 2026 | NPCI / NETC | https://www.netc.org.in | Location and national/state type of FASTag plazas | Public document |
| NETC Plaza Master, May 2025 and Feb 2026 | NPCI / NETC (via Internet Archive) | https://web.archive.org | Backup locations, history | Public document |
| NHAI toll plaza data, January 2022 | NHAI, collected by geohacker/toll-plazas-india | https://github.com/geohacker/toll-plazas-india | Older rates, extra NH plazas | See source repository |
| Toll Plazas in India, 2024 | OpenCity | https://data.opencity.in/dataset/toll-plazas-in-india | Car toll rates | Listed as Public Domain |
| Toll booths (`barrier=toll_booth`) | © OpenStreetMap contributors | https://www.openstreetmap.org/copyright | Toll booths not in official lists | ODbL |
| Villages and towns | GeoNames | https://www.geonames.org | Place search | CC BY 4.0 |

Pass rules: IHMCL Annual Pass FAQ (https://ihmcl.co.in/wp-content/uploads/2025/08/FAQ-Annual-Pass_12.08.25.pdf)
and the Ministry of Road Transport & Highways.

Live services used by the app: OSRM (routing), Photon (place search, OpenStreetMap data),
OpenStreetMap tiles (map), Google Maps and Apple Maps links (navigation hand-off).

**How a toll is marked:** a plaza on the IHMCL NH list, run by NHAI, or on a national highway or
expressway is "covered"; a state-type plaza or any other toll booth is "you pay"; plazas where the
sources disagree are "unknown". Toll rates are 2022–2024 figures and only a guide.

The merged toll data in this repository is available under the ODbL, as it includes OpenStreetMap data.
