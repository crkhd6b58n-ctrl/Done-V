// Dan&Van Fit - service worker
// Build: 72569a854e0f
const CACHE = "danvanfit-72569a854e0f";

self.addEventListener("install", (e) => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Navegación: red primero (para recibir actualizaciones), caché si no hay señal.
// Resto de GET same-origin: caché primero.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const c = await caches.open(CACHE);
          return (await c.match(req))
            || (await c.match(req, { ignoreSearch: true }))
            || (await c.match("./"))
            || (await c.keys().then(ks => ks.length ? c.match(ks[0]) : undefined))
            || new Response("Sin conexión y sin copia guardada todavía.", {
                 status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
               });
        })
    );
    return;
  }

  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
