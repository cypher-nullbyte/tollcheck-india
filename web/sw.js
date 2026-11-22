// Caches the app shell and plaza data so the app opens on weak mobile data.
// Routing, geocoding and map tiles always come from the network.
const CACHE = "tollcheck-v9";
const SHELL = ["./", "index.html", "styles.css", "app.js", "i18n.js", "plazas.json", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isShell = SHELL.some((s) => url.href === new URL(s, self.registration.scope).href);
  if (e.request.method !== "GET" || !isShell) return;
  // Network first (fresh data when online), cache when offline. `no-cache` makes the browser
  // re-check with the server instead of serving a stale copy from its own HTTP cache.
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
