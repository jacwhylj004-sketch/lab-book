/* Service worker: keeps the app working with no internet. BUILD is replaced by build-offline.ps1. */
const CACHE = "labbook-20261127-0953";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./vendor/pdf.min.js", "./vendor/pdf.worker.min.js", "./vendor/jszip.min.js", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("labbook-") && k !== CACHE && k !== "labbook-fonts").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Fonts: keep a copy so the app looks the same offline.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open("labbook-fonts").then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch (err) { return new Response("", { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // The page itself: try the network first so updates arrive, fall back to the saved copy.
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
      .catch(() => caches.match("./index.html", { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
});
