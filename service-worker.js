const CACHE = "jus-downloader-shell-v4";
const OWNED_PREFIX = "jus-downloader-";
const LEGACY_CACHE = "instavault-shell-v2";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./manifest.json", "./assets/icon.svg", "./assets/icon-192.png", "./assets/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => (key.startsWith(OWNED_PREFIX) || key === LEGACY_CACHE) && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const appPath = new URL("./", self.registration.scope).pathname;
  if (!url.pathname.startsWith(appPath)) return;
  event.respondWith(caches.match(req).then(cached => {
    if (cached) return cached;
    return fetch(req).then(res => {
      if (res.ok && req.destination !== "document") {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(new URL("./index.html", self.registration.scope).href));
  }));
});
