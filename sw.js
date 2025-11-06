// Service worker with cache-first + versioning
const CACHE = 'fk-cache-v4';
const ASSETS = [
  '/',
  '/landing.html',
  '/index.html',
  '/invoice.html',
  '/app.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/preview-invoice.png',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(cache => {
          if (request.url.startsWith(self.location.origin)) cache.put(request, copy).catch(()=>{});
        }).catch(()=>{});
        return resp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
