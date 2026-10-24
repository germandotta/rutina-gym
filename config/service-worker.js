const CACHE_NAME = 'entreno-v3';
const urlsToCache = [
  '../entreno-v02.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Red primero, caché como respaldo offline. Antes era caché primero, y cada
// versión nueva de la app no se veía hasta borrar y reinstalar el ícono
// (lo que además borra el localStorage). Solo se cachean GET del mismo origen:
// el Sheet (script.google.com) pasa directo.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
