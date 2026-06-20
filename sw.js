// sw.js — Service Worker : cache l'app shell pour un fonctionnement 100 % hors-ligne.
// Stratégie : cache-first sur les fichiers de l'app (statiques, versionnés par CACHE).

const CACHE = 'caisse-mam-sira-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/utils.js',
  './js/db.js',
  './js/catalog.js',
  './js/config.js',
  './js/cart.js',
  './js/screens/caisse.js',
  './js/screens/especes.js',
  './js/screens/historique.js',
  './js/screens/bilan.js',
  './js/screens/export.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Met en cache au vol les ressources same-origin récupérées avec succès.
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached); // hors-ligne et non caché → échec silencieux
    })
  );
});
