const CACHE_NAME = 'rutina-gym-v1';
const urlsToCache = [
  './rutina-gym-lunes.html',
  './manifest.json',
  './img_bici.png',
  './img_movilidad_hombros.png',
  './img_movilidad_cadera.png',
  './img_extension.png',
  './img_curl.png',
  './img_abduccion.png',
  './img_peso_muerto.png',
  './img_press_pecho.png',
  './img_press_militar.png',
  './img_elevaciones.png',
  './img_fondos.png',
  './img_plancha_frontal.png',
  './img_plancha_lateral.png',
  './img_dead_bug.png',
  './img_estir_cuadriceps.png',
  './img_estir_isquio.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
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
    })
  );
});
