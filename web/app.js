// TollCheck India — plain JS, no build step.
// Flow: place search (Photon) -> routes with alternatives (OSRM) -> match plazas near each route -> compare.
"use strict";

const OSRM = "https://router.project-osrm.org/route/v1/driving/"; // demo server: development only
const ROUTE_COLOURS = ["#2563eb", "#9333ea", "#ea580c", "#0891b2"];
const MATCH_M_OSM = 80;    // NPCI/OSM coordinates are precise (true hits measured 3–41 m; parallel road at 107 m)
const MATCH_M_NHAI = 300;  // NHAI coordinates are rougher
const RETURN_TO_SINGLE = 1.5; // NH fee rules: return fare = 1.5 x single; used only to estimate single fare

const $ = (id) => document.getElementById(id);
const map = L.map("map", { zoomControl: true }).setView([21.5, 78.5], 5);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let PLAZAS = [];
let layers = L.layerGroup().addTo(map);
let state = { routes: [], selected: 0, from: null, to: null };

// ---------- data ----------
fetch("plazas.json").then((r) => r.json()).then((d) => {
  PLAZAS = d.plazas;
  $("status").textContent = t("plazasLoaded", { n: PLAZAS.length });
  // Shareable link: ?from=Mumbai&to=Pune runs the comparison straight away.
  const q = new URLSearchParams(location.search);
  if (q.get("from") && q.get("to")) { $("from").value = q.get("from"); $("to").value = q.get("to"); $("trip").requestSubmit(); }
}).catch(() => { $("status").textContent = t("plazasFail"); });

function status(p) {
  if (p.pass_covered === true) return "covered";
  if (p.pass_covered === false) return "paid";
  return "unknown";
}
function singleFare(p) {
  if (p.car_rate_single) return { v: p.car_rate_single, est: false };
  if (p.car_rate_return) return { v: Math.round(p.car_rate_return / RETURN_TO_SINGLE / 5) * 5, est: true };
  return null;
}
const rupee = (n) => "₹" + n.toLocaleString("en-IN");

// ---------- geometry ----------
// Distance (m) from point to polyline, using a local flat projection; returns {d, idx} (segment index).
function nearestOnLine(lat, lon, coords, bbox) {
  if (lat < bbox[0] - 0.01 || lat > bbox[2] + 0.01 || lon < bbox[1] - 0.01 || lon > bbox[3] + 0.01) return { d: Infinity };
  const k = 111320, kx = k * Math.cos((lat * Math.PI) / 180);
  let best = { d: Infinity, idx: -1 };
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = (coords[i][0] - lon) * kx, ay = (coords[i][1] - lat) * k;
    const bx = (coords[i + 1][0] - lon) * kx, by = (coords[i + 1][1] - lat) * k;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let t = len2 ? -(ax * dx + ay * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy, d = Math.hypot(px, py);
    if (d < best.d) best = { d, idx: i + t };
  }
  return best;
}
function bboxOf(coords) {
  let b = [90, 180, -90, -180];
  for (const [lon, lat] of coords) { b[0] = Math.min(b[0], lat); b[1] = Math.min(b[1], lon); b[2] = Math.max(b[2], lat); b[3] = Math.max(b[3], lon); }
  return b;
}
function tollsOnRoute(coords) {
  const bbox = bboxOf(coords), hits = [];
  for (const p of PLAZAS) {
    // NPCI and OSM coordinates are precise; NHAI 2022 ones (and name-matched ones) are rough.
    const precise = !p.coords_suspect && p.sources.some((s) => s === "OpenStreetMap" || (s.startsWith("NPCI") || s.startsWith("NETC")));
    const max = precise ? MATCH_M_OSM : MATCH_M_NHAI;
    const n = nearestOnLine(p.lat, p.lon, coords, bbox);
    if (n.d <= max) hits.push({ p, at: n.idx, d: n.d });
  }
  // Plaza complexes: an expressway plaza and a highway plaza can sit side by side (e.g. Shedung,
  // ~25 m apart) or one plaza can appear in two sources. Within 400 m, keep only the one nearest the road.
  const kept = [];
  for (const h of hits.sort((a, b) => a.d - b.d)) {
    const osm = (x) => x.id.startsWith("osm-");
    if (!kept.some((k) => distM(k.p, h.p) < ((osm(h.p) && osm(k.p)) ? 1000 : 400))) kept.push(h);
  }
  return kept.sort((a, b) => a.at - b.at).map((h) => h.p);
}
function distM(a, b) {
  const k = 111320, kx = k * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((a.lon - b.lon) * kx, (a.lat - b.lat) * k);
}

// ---------- place search ----------
// Photon (OSM-based, typo-tolerant, made for search-as-you-type): https://photon.komoot.io
// Limited to India, biased towards the other end of the trip so nearby places come first.
const PHOTON = "https://photon.komoot.io/api/";
const INDIA_BBOX = "68,6,98,37.5";
const STATES = ["andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat",
  "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur",
  "meghalaya", "mizoram", "nagaland", "odisha", "orissa", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
  "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "jammu and kashmir", "ladakh", "puducherry",
  "chandigarh", "andaman and nicobar", "lakshadweep", "dadra and nagar haveli", "daman and diu", "up", "mp", "hp", "uk", "india"];
const PLACE_TYPES = new Set(["city", "town", "village", "hamlet", "suburb", "neighbourhood", "quarter", "locality",
  "administrative", "county", "district", "municipality", "borough", "isolated_dwelling"]);

const stripStates = (q) => {
  let s = ` ${q.toLowerCase().replace(/[,]/g, " ")} `;
  for (const st of STATES) s = s.replace(new RegExp(`\\s${st}\\s`, "g"), " ");
  return s.trim().replace(/\s+/g, " ");
};
const typedState = (q) => STATES.slice(0, -1).find((st) => st.length > 2 && ` ${q.toLowerCase()} `.includes(` ${st} `));

async function photon(q, bias) {
  const u = `${PHOTON}?q=${encodeURIComponent(q)}&limit=10&lang=en&bbox=${INDIA_BBOX}` +
    (bias ? `&lat=${bias.lat}&lon=${bias.lon}` : "");
  const j = await (await fetch(u)).json();
  const seen = new Set(), out = [];
  for (const f of j.features || []) {
    const p = f.properties;
    if (p.country && p.country !== "India") continue;
    const district = p.county || p.district || p.city || "";
    const item = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: p.name || "",
      district: district === p.name ? "" : district, state: p.state || "", type: p.osm_value || "" };
    const key = `${item.name}|${item.state}`.toLowerCase();
    if (!item.name || seen.has(key)) continue;
    seen.add(key); out.push(item);
  }
  // Towns/villages/districts first (keep Photon's order inside each group: it already ranks by match + nearness)
  return [...out.filter((x) => PLACE_TYPES.has(x.type)), ...out.filter((x) => !PLACE_TYPES.has(x.type))];
}
const describe = (x) => [x.district, x.state].filter(Boolean).join(", ");
const placeText = (x) => [x.name, x.district, x.state].filter(Boolean).join(", ");

// ---------- GeoNames village/town index (web/places/, built by scripts/build_places.py) ----------
// 5.5 lakh Indian villages and towns (CC BY 4.0), split by the first two letters of the name.
const norm = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const shardCache = {};
let placesMeta = null;
async function shard(k) {
  if (!/^[a-z0-9]{2}$/.test(k)) return [];
  if (!placesMeta) placesMeta = fetch("places/_meta.json").then((r) => r.json()).catch(() => ({ districts: [], states: [] }));
  if (!shardCache[k]) shardCache[k] = fetch(`places/${k}.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return shardCache[k];
}
// Similarity 0..1 of two strings (shared letter pairs): tolerant of typos like "ladva" / "panyali kasimpur"
function sim(a, b) {
  a = a.replace(/ /g, ""); b = b.replace(/ /g, "");
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const pairs = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const p = s.slice(i, i + 2); m.set(p, (m.get(p) || 0) + 1); } return m; };
  const A = pairs(a), B = pairs(b); let hit = 0;
  for (const [p, n] of A) hit += Math.min(n, B.get(p) || 0);
  return (2 * hit) / (a.length - 1 + b.length - 1);
}
const km = (a, b) => Math.hypot((a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180), (a.lat - b.lat) * 111);

// Find `namePart` in GeoNames. Returns [{name, lat, lon, district, state, pop, score}]
async function geonamesFind(namePart) {
  const n = norm(namePart); if (n.length < 3) return [];
  const [rows, meta] = await Promise.all([shard(n.slice(0, 2)), shard(n.slice(0, 2)).then(() => placesMeta)]);
  const out = [];
  for (const r of rows) {
    let s = sim(n, norm(r[0]));
    for (const a of r[6]) s = Math.max(s, sim(n, norm(a)));
    if (norm(r[0]).startsWith(n)) s = Math.max(s, 0.8 + 0.2 * (n.length / norm(r[0]).length));
    if (s >= 0.72) out.push({ name: r[0], lat: r[1], lon: r[2], district: meta.districts[r[3]] || "",
                              state: meta.states[r[4]] || "", pop: r[5], type: "village", src: "GeoNames", score: s });
  }
  return out;
}

// Words after the place name: a state ("uttar pradesh"), a district ("muzaffarnagar") or a nearby town ("charthawal").
async function geonamesSearch(q, bias) {
  const words = norm(q).split(" ").filter(Boolean);
  for (let cut = words.length; cut >= 1; cut--) {
    const namePart = words.slice(0, cut).join(" "), rest = words.slice(cut).join(" ");
    let cands = await geonamesFind(namePart);
    if (!cands.length) continue;
    let near = null;
    if (rest) {
      const st = typedState(rest), restNoState = norm(stripStates(rest));
      if (st) cands = cands.filter((c) => norm(c.state).includes(st) || st.length <= 2) .length ? cands.filter((c) => norm(c.state).includes(st) || st.length <= 2) : cands;
      if (restNoState) {
        const inDistrict = cands.filter((c) => c.district && sim(restNoState, norm(c.district)) >= 0.75);
        if (inDistrict.length) cands = inDistrict;
        else {                                             // treat it as a nearby town: "ladwa charthawal"
          const ref = (await geonamesFind(restNoState)).sort((a, b) => b.score - a.score || b.pop - a.pop)[0]
                   || (await photon(restNoState, bias))[0];
          if (ref) near = ref;
        }
      }
    }
    // Confidence: if a nearby place was named, keep only matches within 40 km of it; a far-away
    // namesake (e.g. "Panyali" in Himachal for "Panyali Kasimpur") is not an answer.
    if (near) { cands = cands.filter((c) => km(c, near) <= 40); if (!cands.length) continue; }
    // When the whole text did not match and extra words were not understood, do not guess.
    if (rest && !near && !typedState(rest) && cands.every((c) => !c.district || sim(norm(stripStates(rest)), norm(c.district)) < 0.75)) continue;
    // A nearby town the person named outweighs everything else; otherwise size and the trip's other end count.
    for (const c of cands) {
      // Exact name beats a similar one ("Jaipur" must not become "Jaitpur"); bigger places rank higher.
      const exact = norm(c.name) === norm(namePart) ? 5 : 0;
      c.rank = c.score * 10 + exact + (near ? -Math.min(km(c, near), 400) / 5
                                    : Math.log10(c.pop + 1) * 0.6 - (bias ? Math.min(km(c, bias), 400) / 80 : 0));
      if (near) c.nearNote = t("kmFrom", { km: Math.round(km(c, near)), place: near.name });
    }
    const res = cands.sort((a, b) => b.rank - a.rank).slice(0, 8);
    res.near = near;
    return res;
  }
  return [];
}

// Search both sources; merge; a typed state narrows the results instead of being dropped.
async function searchPlaces(q, bias) {
  const [ph, gn] = await Promise.all([
    photon(q, bias).catch(() => []),
    geonamesSearch(q, bias).catch(() => []),
  ]);
  let phItems = ph;
  const first = norm(stripStates(q)).split(" ")[0] || "";
  if (!phItems.some((x) => norm(x.name).includes(first.slice(0, 4))) && stripStates(q) !== q.toLowerCase())
    phItems = await photon(stripStates(q), bias).catch(() => []);
  // Photon results that actually match the name typed, scored like GeoNames ones
  const qn = norm(stripStates(q));
  const near = gn.near;
  const phScored = phItems.map((x) => ({ ...x, src: "OpenStreetMap",
    rank: Math.max(sim(qn, norm(x.name)), sim(first, norm(x.name))) * 10
          + (norm(x.name) === qn || norm(x.name) === first ? 5 : 0)
          + (["city", "town", "administrative"].includes(x.type) ? 3 : PLACE_TYPES.has(x.type) ? 1 : -3)
          - (near ? Math.min(km(x, near), 400) / 5 : bias ? Math.min(km(x, bias), 400) / 80 : 0) }));
  const st = typedState(q);
  let all = [...gn, ...phScored];
  if (st && st.length > 2 && all.some((x) => norm(x.state).includes(st))) all = all.filter((x) => norm(x.state).includes(st));
  // Drop weak OpenStreetMap hits (clinics, shops with a similar word) when the name itself does not match.
  all = all.filter((x) => x.src === "GeoNames" || Math.max(sim(qn, norm(x.name)), sim(first, norm(x.name))) >= 0.75);
  all.sort((a, b) => b.rank - a.rank);
  const out = [];
  for (const x of all) if (!out.some((y) => norm(y.name) === norm(x.name) && km(x, y) < 3)) out.push(x);
  return out;
}

function biasFor(input) {
  const other = input.id === "from" ? $("to") : $("from");
  if (other._picked) return other._picked;
  if (map.getZoom() >= 7) { const c = map.getCenter(); return { lat: c.lat, lon: c.lng }; }
  return null;
}

// Resolve what is in a box: the suggestion the person picked, else the best search match.
async function geocode(input) {
  const q = input.value.trim();
  if (input._picked && input._picked.text === q) return input._picked;
  const items = await searchPlaces(q, biasFor(input));
  if (!items.length) throw new Error(t("notFound", { q }));
  const x = items[0], ts = typedState(q);
  const note = ts && x.state && !x.state.toLowerCase().includes(ts)
    ? t("usingInstead", { place: `${x.name}, ${x.state}`, typed: ts.replace(/\b\w/g, (c) => c.toUpperCase()) }) : "";
  return pick(input, x, note);
}
function pick(input, x, note = "") {
  const text = placeText(x);
  input.value = text;
  // `full` is what we hand to Google/Apple Maps.
  input._picked = { lat: x.lat, lon: x.lon, label: [x.name, x.district, x.state].filter(Boolean).join(", "), text, note,
                    full: [x.name, x.district, x.state, "India"].filter(Boolean).join(", ") };
  return input._picked;
}

// ---------- suggestions dropdown ----------
function attachSuggest(input) {
  const list = document.createElement("ul");
  list.className = "suggest"; list.hidden = true; list.setAttribute("role", "listbox");
  input.after(list);
  input.setAttribute("autocomplete", "off");
  let timer = null, items = [], active = -1, seq = 0, noMatch = false;
  const render = () => {
    list.innerHTML = noMatch
      ? `<li class="hint">${t("noMatch")}</li>`
      : items.map((x, i) =>
      `<li role="option" data-i="${i}" class="${i === active ? "active" : ""}"><b>${esc(x.name)}</b>` +
      `<span>${esc(describe(x))}${x.nearNote ? ` · ${esc(x.nearNote)}` : ""}` +
      `${x.type && !PLACE_TYPES.has(x.type) ? ` · ${esc(x.type)}` : ""}</span></li>`).join("");
    list.hidden = !items.length && !noMatch;
  };
  input.addEventListener("input", () => {
    input._picked = null;
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { items = []; noMatch = false; render(); return; }
    timer = setTimeout(async () => {
      const my = ++seq;
      try { const r = await searchPlaces(q, biasFor(input)); if (my === seq) { items = r.slice(0, 6); noMatch = !items.length; active = -1; render(); } }
      catch { /* network hiccup: keep typing works, submit will retry */ }
    }, 300);
  });
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { active = Math.min(active + 1, items.length - 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); render(); e.preventDefault(); }
    else if (e.key === "Enter" && active >= 0) { pick(input, items[active]); items = []; noMatch = false; render(); e.preventDefault(); }
    else if (e.key === "Escape") { items = []; noMatch = false; render(); }
  });
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-i]"); if (!li) return;   // the "no match" hint is not clickable
    e.preventDefault(); pick(input, items[+li.dataset.i]); items = []; noMatch = false; render();
  });
  input.addEventListener("blur", () => setTimeout(() => { items = []; noMatch = false; render(); }, 150));
}
async function getRoutes(a, b) {
  const u = `${OSRM}${a.lon},${a.lat};${b.lon},${b.lat}?alternatives=3&overview=full&geometries=geojson&steps=true`;
  const r = await fetch(u);
  const j = await r.json();
  if (j.code !== "Ok") throw new Error(t("noRoute"));
  return j.routes;
}

// ---------- analysis ----------
function analyse(route, i) {
  const coords = route.geometry.coordinates;
  // OSM-only booths (on no official list): look up which road they sit on. On a national highway or
  // national expressway (ref NH…/NE…) the pass may well apply, so show them as unknown instead of "you pay".
  const steps = (route.legs || []).flatMap((l) => l.steps || []).filter((st) => st.geometry && st.geometry.coordinates.length > 1);
  const tolls = tollsOnRoute(coords).map((p) => {
    if (!p.id.startsWith("osm-") || p.pass_covered !== false || p.operator_type === "state" || !steps.length) return p;
    let best = null, bd = Infinity;
    for (const st of steps) {
      const c = st.geometry.coordinates, n = nearestOnLine(p.lat, p.lon, c, bboxOf(c));
      if (n.d < bd) { bd = n.d; best = st; }
    }
    const road = best ? `${best.ref || ""} ${best.name || ""}` : "";
    if (/\b(NH|NE)\s*-?\s*\d|expressway/i.test(road))
      // Rule (agreed 2026-11-22): a toll on a national highway / expressway is an NH toll → pass applies.
      return { ...p, pass_covered: true, operator_type: "national", likely: true,
               coverage_reason: `On ${road.trim()} (national highway/expressway), so treated as an NH toll. Not yet on the official list: probably new or an expressway booth.` };
    return p;
  });
  let extra = 0, extraEst = false, unpricedPaid = 0, saved = 0;
  const c = { covered: 0, paid: 0, unknown: 0 };
  for (const p of tolls) {
    const s = status(p); c[s]++;
    const f = singleFare(p);
    if (s === "paid") { if (f) { extra += f.v; extraEst ||= f.est; } else unpricedPaid++; }
    if (s === "covered" && f) saved += f.v;
  }
  // Closed expressways: you pay ONCE for the stretch between entry and exit, and the Annual Pass counts
  // "one pair of entry and exit" as one trip (IHMCL Annual Pass FAQ, Q11, 12 Aug 2025). Their interchange
  // plazas along the road are shown as ONE toll: "enter near X, exit near Y".
  // Expressway plaza = official highway "NE-x", or an NHAI ramp/interchange plaza (DME, Interchange, Ramp,
  // Virtual, Exit, Expressway in the name).
  const keyOf = (p) => {
    if (status(p) !== "covered") return null;
    const ne = (p.highway || "").match(/NE-?\s*([0-9A-Z]+)/i);
    if (ne) return "NE-" + ne[1].toUpperCase();
    return /\b(DME|interchange|ramp|virtual|exit|expressway)\b/i.test(p.name) ? "closed" : null;
  };
  const shown = [], groupAt = {};
  for (const p of tolls) {                 // tolls are in driving order
    const k = keyOf(p);
    if (!k) { shown.push(p); continue; }
    if (!(k in groupAt)) { groupAt[k] = shown.length; shown.push({ group: k, plazas: [] }); }
    shown[groupAt[k]].plazas.push(p);
  }
  for (const g of shown) if (g.group) {
    const first = g.plazas[0], last = g.plazas[g.plazas.length - 1];
    g.name = `${g.group === "closed" ? t("expressway") : `${t("expressway")} ${g.group}`} ${t("closedToll")}`;
    g.detail = g.plazas.length > 1 ? t("enterExit", { a: first.name, b: last.name }) : first.name;
    g.pass_covered = true; g.sources = []; g.coords_suspect = false;
  }
  const trips = shown.filter((x) => status(x) === "covered").length;
  const sc = { covered: 0, paid: 0, unknown: 0 };
  for (const x of shown) sc[status(x)]++;
  return { i, route, coords, tolls, shown, c: sc, extra, extraEst, unpricedPaid, saved, trips,
           expressway: Object.keys(groupAt).length > 0, km: route.distance / 1000, min: route.duration / 60 };
}
// Best for the pass: fewest tolls the pass does not cover (paid + unknown), then least extra ₹, then fastest.
// A route with no tolls in our data is not proof of a free road (the data has gaps), so it ranks
// after routes whose tolls are all known to be covered.
// Order: tolls you pay → extra ₹ → pass trips used → time. A route only wins on time when it is
// more than 15 minutes faster (saving 3 minutes is not worth spending extra pass trips).
function rank(list) {
  const risk = (r) => r.c.paid + r.c.unknown + (r.shown.length === 0 ? 0.5 : 0);
  return [...list].sort((a, b) => risk(a) - risk(b) || a.extra - b.extra ||
    (Math.abs(a.min - b.min) > 15 ? a.min - b.min : (a.trips - b.trips) || (a.min - b.min)));
}

// ---------- navigation hand-off ----------
// Links carry ONLY start and destination, never waypoints: Google/Apple turn every coordinate
// waypoint into a visible stop named after the nearest business (tested 22 Nov 2026: a salon, a
// medical shop, a bhojnalaya). Google then lists its own routes as "via NH 334" etc., so each card
// names its main roads and tells the person which one to pick.
function roads(r) {
  const s = (r.route.legs || []).map((l) => l.summary).filter(Boolean).join(", ");
  return s.replace(/\b(NH|SH|NE)\s*-?\s*(\d+\w*)/g, "$1 $2");
}
const placeName = (p) => encodeURIComponent(p.full || `${p.lat},${p.lon}`);
// Google Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
function googleUrl() {
  return "https://www.google.com/maps/dir/?api=1&travelmode=driving" +
    `&origin=${placeName(state.from)}&destination=${placeName(state.to)}`;
}
// Apple unified Maps URLs (iOS 18.4+ / macOS 15.4+)
function appleUrl() {
  return `https://maps.apple.com/directions?mode=driving` +
    `&source=${placeName(state.from)}&destination=${placeName(state.to)}`;
}

// ---------- rendering ----------
const fmtTime = (m) => (m >= 60 ? `${Math.floor(m / 60)} ${t("h")} ${Math.round(m % 60)} ${t("min")}` : `${Math.round(m)} ${t("min")}`);

function draw() {
  layers.clearLayers();
  const order = state.routes.map((r) => r.i).sort((a, b) => (a === state.selected) - (b === state.selected));
  for (const idx of order) {
    const r = state.routes.find((x) => x.i === idx), sel = idx === state.selected;
    L.polyline(r.coords.map(([lon, lat]) => [lat, lon]), {
      color: ROUTE_COLOURS[idx % 4], weight: sel ? 6 : 4, opacity: sel ? 0.9 : 0.4,
    }).on("click", () => select(idx)).addTo(layers);
  }
  // Toll markers for the selected route (colours: see legend):
  //   dark green = covered toll you pass · light green = covered plaza nearby / interchange you drive past
  //   dark red   = toll you pay         · light red   = pay-toll nearby (within 5 km) · grey = unknown
  const sel = state.routes.find((x) => x.i === state.selected);
  const C = { on: { covered: "#1f9d55", paid: "#c0392b", unknown: "#7d8480" },
              near: { covered: "#9fe0b8", paid: "#f4a49c", unknown: "#c3c7c5" } };
  const passBy = new Set();                       // expressway interchanges between entry and exit
  for (const g of sel.shown) if (g.group) g.plazas.slice(1, -1).forEach((p) => passBy.add(p.id));
  const onRoute = new Set(sel.tolls.map((p) => p.id));
  const mark = (p, kind, title) => L.circleMarker([p.lat, p.lon], {
      radius: kind === "on" ? 8 : 5, color: "#fff", weight: kind === "on" ? 2 : 1,
      fillColor: C[kind][status(p)], fillOpacity: kind === "on" ? 1 : 0.9, dashArray: p.coords_suspect ? "3" : null,
    }).bindPopup((title ? `<small>${title}</small><br>` : "") + popup(p)).addTo(layers);
  // nearby: within 5 km of the selected road, not on it
  const bb = bboxOf(sel.coords), pad = 0.05;
  for (const p of PLAZAS) {
    if (onRoute.has(p.id)) continue;
    if (p.lat < bb[0] - pad || p.lat > bb[2] + pad || p.lon < bb[1] - pad || p.lon > bb[3] + pad) continue;
    if (nearestOnLine(p.lat, p.lon, sel.coords, [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad]).d <= 5000)
      mark(p, "near", t("nearbyNot"));
  }
  for (const p of sel.tolls)
    passBy.has(p.id) ? mark(p, "near", t("interchange")) : mark(p, "on", t("onThisRoad"));
  L.marker([state.from.lat, state.from.lon], { title: "Start" }).addTo(layers);
  L.marker([state.to.lat, state.to.lon], { title: "End" }).addTo(layers);
}

function popup(p) {
  const f = singleFare(p), s = status(p);
  const label = { covered: t("popCovered"), paid: t("popPaid"), unknown: t("popUnknown") }[s];
  return `<b>${esc(p.name)}</b><br>${label}` +
    (f ? `<br>${t("carOneWay", { v: `${f.est ? "≈" : ""}${rupee(f.v)} (${p.effective_from === "2024" ? "2024" : "2022"})` })}` : `<br>${t("rateUnknown")}`) +
    (p.highway ? `<br><small>${esc(p.highway)}</small>` : "") +
    (p.coverage_reason ? `<br><small>${t("why", { w: esc(p.coverage_reason) })}</small>` : "") +
    (p.operator ? `<br><small>${t("operator", { o: esc(p.operator) })}</small>` : "") +
    (p.coords_suspect ? `<br><small style="color:#d64541">${t("locDoubt")}</small>` : "") +
    (p.sources.length ? `<br><small>${t("sources", { s: esc(p.sources.join(", ")) })}</small>` : "");
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function cards() {
  const ranked = rank(state.routes);
  const best = ranked[0].i;
  $("routes").innerHTML = ranked.map((r) => {
    const name = `${t("route")} ${String.fromCharCode(65 + r.i)}`;
    let extra;
    if (r.shown.length === 0) {
      extra = t("noTollsData");
    } else if (r.c.paid === 0 && r.c.unknown === 0) {
      extra = t("zeroExtra");
    } else if (r.c.paid === 0) {
      extra = t("extraUnknown", { n: r.c.unknown });
    } else {
      // When the amount is unknown, reuse the translated phrase "Extra cost unknown" (bold part of extraUnknown):
      // "{amt} extra" with amt = "unknown" reads word-for-word wrong in most Indian languages.
      const unknownPhrase = (t("extraUnknown").match(/<b>(.*?)<\/b>/) || [, t("unknownAmt")])[1];
      extra = (r.extra ? t("extraPay", { amt: (r.extraEst ? "≈" : "") + rupee(r.extra) }) : `<b class="paid">${unknownPhrase}</b>`) +
        (r.extra && r.unpricedPaid ? t("unpriced", { n: r.unpricedPaid }) : "") +
        (r.c.unknown ? t("unknownCoverage", { n: r.c.unknown }) : "");
    }
    return `<div class="route ${r.i === state.selected ? "selected" : ""}" data-i="${r.i}">
      <h3><span class="swatch" style="background:${ROUTE_COLOURS[r.i % 4]}"></span>${name}
        ${r.i === best ? `<span class="badge">${t("bestForPass")}</span>` : ""}</h3>
      <div class="headline">${r.shown.length === 0 ? t("tolls0") : r.shown.length === 1 ? t("tolls1") : t("tollsN", { n: r.shown.length })}
        ${[r.c.paid ? `<b class="paid">${t("youPay", { n: r.c.paid })}</b>` : "", r.c.covered ? `<b class="ok">${t("coveredByPass", { n: r.c.covered })}</b>` : "",
           r.c.unknown ? t("unknownN", { n: r.c.unknown }) : ""].filter(Boolean).join(" · ")}
        ${r.trips ? ` · ${t("usesTrips", { n: r.trips })}` : ""}</div>
      <div class="meta">${r.km.toFixed(0)} km · ${fmtTime(r.min)}</div>
      <div class="sum">${extra}</div>
      ${r.shown.length ? `<details><summary>${t("tollList")}</summary><ul>${r.shown.map((p) => {
        const f = p.group ? null : singleFare(p);
        return `<li><i class="dot ${status(p)}"></i><span>${esc(p.name)}${f ? ` — ${f.est ? "≈" : ""}${rupee(f.v)}` : ""}
          ${p.detail ? `<br><small>${esc(p.detail)}</small>` : ""}
          ${p.coords_suspect ? '<span class="warn">(location doubtful)</span>' : ""}</span></li>`;
      }).join("")}</ul></details>` : ""}
      ${roads(r) ? `<div class="meta">${t("mainRoads", { roads: esc(roads(r)) })}</div>` : ""}
      <div class="actions"><button type="button" data-show="${r.i}">${t("showOnMap")}</button>
        <a href="${googleUrl()}" target="_blank" rel="noopener">${t("googleMaps")}</a>
        <a href="${appleUrl()}" target="_blank" rel="noopener">${t("appleMaps")}</a></div>
      <div class="actions secondary"><button type="button" data-save="${r.i}">${t("saveRoute")}</button>
        <button type="button" data-share="${r.i}">${t("share")}</button></div>
    </div>`;
  }).join("");
}

// ---------- share: a plain-text summary + the Google Maps link, so whoever receives it can drive straight away ----------
async function shareRoute(r) {
  const label = { covered: t("shareCovered"), paid: t("sharePay"), unknown: t("shareUnknown") };
  const text = [`${state.from.label} → ${state.to.label}` + (roads(r) ? ` (${t("via", { r: roads(r) })})` : ""),
    t("shareTolls", { km: Math.round(r.km), time: fmtTime(r.min), n: r.shown.length, p: r.c.paid, c: r.c.covered, t: r.trips }),
    ...r.shown.map((p) => `- ${p.name}${p.detail ? ` (${p.detail})` : ""}: ${label[status(p)]}`),
    t("shareOpen", { url: googleUrl() }),
    t("shareNote")].join("\n");
  try {
    if (navigator.share) { await navigator.share({ title: t("title"), text }); return; }
    await navigator.clipboard.writeText(text);
    $("status").textContent = t("copied");
  } catch { /* share sheet closed */ }
}

// ---------- saved routes (on this device only: localStorage) ----------
const SAVED_KEY = "fastag-pass-routes:saved";
function loadSaved() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; } }
function storeSaved(list) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* private mode: not saved */ } }
function saveRoute(r) {
  const list = loadSaved().filter((s) => !(s.from.text === state.from.text && s.to.text === state.to.text && s.roads === roads(r)));
  list.unshift({ from: state.from, to: state.to, roads: roads(r), km: Math.round(r.km),
                 tolls: { covered: r.c.covered, paid: r.c.paid, unknown: r.c.unknown }, saved: new Date().toISOString().slice(0, 10) });
  storeSaved(list.slice(0, 20));
  renderSaved();
  $("status").textContent = t("savedMsg", { from: state.from.label, to: state.to.label, via: roads(r) ? ` (${t("via", { r: roads(r) })})` : "" });
}
function renderSaved() {
  const list = loadSaved();
  $("saved").innerHTML = list.length ? `<div class="saved-title">${t("myRoutes")}</div>` + list.map((s, i) =>
    `<div class="saved-item"><button type="button" class="saved-open" data-open="${i}">
       <b>${esc(s.from.text)} → ${esc(s.to.text)}</b>
       <span>${s.roads ? `${t("via", { r: esc(s.roads) })} · ` : ""}${s.km} km · ${t("savedPay", { p: s.tolls.paid, c: s.tolls.covered })}</span>
     </button><button type="button" class="saved-del" data-del="${i}" aria-label="${t("delete")}">✕</button></div>`).join("") : "";
}
$("saved").addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]"), del = e.target.closest("[data-del]");
  const list = loadSaved();
  if (del) { list.splice(+del.dataset.del, 1); storeSaved(list); renderSaved(); return; }
  if (open) {
    const s = list[+open.dataset.open];
    $("from").value = s.from.text; $("from")._picked = s.from;   // no new search: use the saved places
    $("to").value = s.to.text; $("to")._picked = s.to;
    $("trip").requestSubmit();
  }
});
renderSaved();

function select(i) { state.selected = i; draw(); cards(); }

$("routes").addEventListener("click", (e) => {
  const show = e.target.closest("[data-show]");
  const card = e.target.closest(".route");
  const save = e.target.closest("[data-save]");
  if (save) { saveRoute(state.routes.find((r) => r.i === +save.dataset.save)); return; }
  const share = e.target.closest("[data-share]");
  if (share) { shareRoute(state.routes.find((r) => r.i === +share.dataset.share)); return; }
  if (show) { select(+show.dataset.show); map.fitBounds(L.polyline(state.routes.find((r) => r.i === +show.dataset.show).coords.map(([a, b]) => [b, a])).getBounds(), { padding: [20, 20] }); }
  else if (card && !e.target.closest("a, details")) select(+card.dataset.i);
});

// ---------- form ----------
$("trip").addEventListener("submit", async (e) => {
  e.preventDefault();
  const go = $("go"); go.disabled = true;
  try {
    $("status").textContent = t("findingPlaces");
    state.from = await geocode($("from"));
    state.to = await geocode($("to"));
    $("status").textContent = t("findingRoutes");
    const routes = await getRoutes(state.from, state.to);
    state.routes = routes.map(analyse);
    state.selected = rank(state.routes)[0].i;
    $("status").textContent = t("routesFound", { from: state.from.label, to: state.to.label, n: routes.length }) + " " +
      [state.from.note, state.to.note].filter(Boolean).join(" ");
    history.replaceState(null, "", `?from=${encodeURIComponent($("from").value.trim())}&to=${encodeURIComponent($("to").value.trim())}`);
    draw(); cards();
    map.fitBounds(L.polyline(state.routes.flatMap((r) => r.coords.map(([a, b]) => [b, a]))).getBounds(), { padding: [20, 20] });
  } catch (err) {
    // Never leave an old route on screen next to an error: it would look like the answer.
    state.routes = []; layers.clearLayers(); $("routes").innerHTML = "";
    $("status").textContent = err.message || t("genericError");
  } finally { go.disabled = false; }
});
$("swap").addEventListener("click", () => {
  const f = $("from").value, fp = $("from")._picked;
  $("from").value = $("to").value; $("from")._picked = $("to")._picked;
  $("to").value = f; $("to")._picked = fp;
});
attachSuggest($("from"));
attachSuggest($("to"));
document.querySelectorAll(".presets button").forEach((b) => b.addEventListener("click", () => {
  $("from").value = b.dataset.from; $("to").value = b.dataset.to; $("trip").requestSubmit();
}));

// ---------- report a toll (photo + GPS + type; name and mobile optional) ----------
// Until a server exists, reports are kept on this device and shown on the map as purple dots.
const REPORTS_KEY = "fastag-pass-routes:reports";
const loadReports = () => { try { return JSON.parse(localStorage.getItem(REPORTS_KEY)) || []; } catch { return []; } };
const rep = { photo: null, lat: null, lon: null, acc: null, type: null };
function resetReport() {
  Object.assign(rep, { photo: null, lat: null, lon: null, acc: null, type: null });
  $("rPreview").hidden = true; $("rPhotoText").textContent = t("takePhoto");
  $("rName").value = ""; $("rMobile").value = ""; $("rMsg").textContent = "";
  document.querySelectorAll(".r-types button").forEach((b) => b.classList.remove("on"));
  updateSend();
}
function updateSend() { $("rSend").disabled = !(rep.photo && rep.lat !== null && rep.type); }
function locate() {
  $("rLoc").textContent = t("gettingLoc");
  if (!navigator.geolocation) { $("rLoc").textContent = t("locNone"); return; }
  navigator.geolocation.getCurrentPosition((pos) => {
    rep.lat = +pos.coords.latitude.toFixed(6); rep.lon = +pos.coords.longitude.toFixed(6); rep.acc = Math.round(pos.coords.accuracy);
    $("rLoc").textContent = t("locFound", { m: rep.acc }); updateSend();
  }, () => { $("rLoc").innerHTML = `${t("locBlocked")} <button type="button" id="rRetry">${t("tryAgain")}</button>`; }, { enableHighAccuracy: true, timeout: 15000 });
}
// Shrink the photo to max 1280 px, JPEG: small enough to store and send on mobile data.
function shrink(file) {
  return new Promise((ok, fail) => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", 0.7)); URL.revokeObjectURL(img.src);
    }; img.onerror = fail; img.src = URL.createObjectURL(file);
  });
}
// v1.0: reporting is not live yet (no server to receive reports). The button says "coming soon".
// The report sheet below is kept for the next version: set REPORTS_LIVE = true to bring it back.
const REPORTS_LIVE = false;
$("reportBtn").addEventListener("click", () => {
  if (!REPORTS_LIVE) { $("installHelpText").textContent = t("reportSoon"); $("installHelp").showModal(); return; }
  resetReport(); $("report").showModal(); locate();
});
$("rCancel").addEventListener("click", () => $("report").close());
$("report").addEventListener("click", (e) => { if (e.target.id === "rRetry") locate(); });
$("rPhoto").addEventListener("change", async () => {
  const f = $("rPhoto").files[0]; if (!f) return;
  rep.photo = await shrink(f); $("rPreview").src = rep.photo; $("rPreview").hidden = false;
  $("rPhotoText").textContent = t("retakePhoto"); updateSend();
});
document.querySelectorAll(".r-types button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".r-types button").forEach((x) => x.classList.toggle("on", x === b));
  rep.type = b.dataset.type; updateSend();
}));
$("rSend").addEventListener("click", () => {
  const list = loadReports();
  list.unshift({ at: new Date().toISOString(), lat: rep.lat, lon: rep.lon, accuracy_m: rep.acc, type: rep.type,
                 name: $("rName").value.trim() || null, mobile: $("rMobile").value.trim() || null, photo: rep.photo });
  try { localStorage.setItem(REPORTS_KEY, JSON.stringify(list.slice(0, 30))); $("rMsg").textContent = ""; }
  catch { $("rMsg").textContent = t("storageFull"); return; }
  $("report").close(); drawReports();
  $("status").textContent = t("reportThanks");
});
let reportLayer = L.layerGroup().addTo(map);
function drawReports() {
  reportLayer.clearLayers();
  const label = { nhai: t("typeNhai"), state: t("typeState"), unknown: t("typeUnknown") };
  for (const r of loadReports()) L.circleMarker([r.lat, r.lon], { radius: 7, color: "#fff", weight: 2, fillColor: "#7b4fd6", fillOpacity: 1 })
    .bindPopup(`<b>${esc(r.name || t("reportedByYou"))}</b><br>${label[r.type]}<br><small>${r.at.slice(0, 10)} · ${t("waitingReview")}</small>` +
               (r.photo ? `<br><img src="${r.photo}" style="max-width:180px;margin-top:4px;border-radius:6px">` : "")).addTo(reportLayer);
}
drawReports();
if (new URLSearchParams(location.search).get("report")) $("reportBtn").click();   // link straight to the report sheet

// ---------- help ----------
function openHelp() { $("help").showModal(); $("help").scrollTop = 0; $("helpTop").focus(); }   // open at the top, not at "Got it"
document.addEventListener("click", (e) => { if (e.target.closest("[data-help]")) openHelp(); });
$("helpClose").addEventListener("click", () => $("help").close());
if (new URLSearchParams(location.search).get("help")) openHelp();

// ---------- language ----------
applyLang();                                   // English/Hindi immediately; other languages once their file loads
if (!I18N[LANG]) loadLang(LANG).then((ok) => { if (!ok) LANG = "en"; applyLang(); document.dispatchEvent(new Event("langchange")); });
$("lang").addEventListener("change", (e) => setLang(e.target.value));
document.addEventListener("langchange", () => {
  renderSaved();
  if (state.routes.length) {           // redo the cards and map labels in the new language
    state.routes = state.routes.map((r) => analyse(r.route, r.i));
    draw(); cards();
  }
});

// ---------- install button ----------
// Android/desktop Chrome & Edge give an install prompt (beforeinstallprompt). iPhone Safari does not, so the
// button shows the two steps instead. Hidden when the app is already running installed.
const installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let installEvent = null;
if (!installed) {
  if (isIOS) $("installBtn").hidden = false;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; $("installBtn").hidden = false; });
}
window.addEventListener("appinstalled", () => { $("installBtn").hidden = true; installEvent = null; });
$("installBtn").addEventListener("click", async () => {
  if (installEvent) { installEvent.prompt(); await installEvent.userChoice.catch(() => {}); installEvent = null; return; }
  $("installHelpText").innerHTML = isIOS ? t("installIos") : t("installOther");
  $("installHelp").showModal();
});
$("installHelpClose").addEventListener("click", () => $("installHelp").close());

// ---------- PWA ----------
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
