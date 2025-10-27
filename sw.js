const CACHE_NAME = 'freelancekit-v1';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'pdf.js',
  'manifest.json',
  'assets/logo.svg',
  'assets/icon.svg',
  'templates/invoice-default.json',
  'templates/invoice-pro-classic.json',
  'templates/invoice-pro-modern.json',
  'templates/quote-default.json',
  'templates/contract-default.json',
  'pages/privacy.html',
  'pages/terms.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res=>{
      // Cache new GETs
      if (req.method==='GET' && res.ok) {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, resClone));
      }
      return res;
    }).catch(()=> cached || (req.mode==='navigate' ? caches.match('index.html') : undefined)))
  );
});
