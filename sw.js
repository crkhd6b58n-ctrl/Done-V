// Dan&Van Fit - service worker
// Build: 7ffdc4e8d655
const CACHE = "danvanfit-7ffdc4e8d655";
const SHELL = "./__app_shell__";   // copia del HTML para responder navegaciones sin red

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
          // Guarda la copia BAJO UNA LLAVE PROPIA además de la URL. Antes el
          // último recurso era "la primera entrada del caché", que podía ser
          // sw.js: el navegador recibía JavaScript donde esperaba HTML y
          // pintaba la página en blanco.
          if (res.ok) {
            const byUrl = res.clone(), asShell = res.clone();
            caches.open(CACHE).then(c => { c.put(req, byUrl); c.put(SHELL, asShell); });
          }
          return res;
        })
        .catch(async () => {
          const c = await caches.open(CACHE);
          return (await c.match(req))
            || (await c.match(req, { ignoreSearch: true }))
            || (await c.match(SHELL))
            || new Response("Sin conexión y sin copia guardada todavía.", {
                 status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
               });
        })
    );
    return;
  }

  if (new URL(req.url).origin !== self.location.origin) return;

  if (new URL(req.url).pathname.endsWith("/sw.js")) return;

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      // 206 es una respuesta parcial (video pedido por rangos): res.ok es
      // true pero la Cache API la rechaza y lanza. Hay que excluirla.
      if (res.ok && res.status !== 206 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
