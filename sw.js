const CACHE = 'freelancekit-v6-cf'; // bump to invalidate old cache
const ASSETS = [
  '/', '/index.html',
  '/styles.css', '/app.js',
  '/manifest.json', '/assets/icon-192.png', '/assets/icon-512.png',
  '/pages/privacy.html', '/pages/terms.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => cached))
    );
  }
});
