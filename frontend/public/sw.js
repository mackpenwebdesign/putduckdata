const CACHE_NAME = 'putduckdata-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo/logo.png',
  '/favicon.ico',
];

// Install: cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always skip API calls — never cache them
  if (url.pathname.startsWith('/api')) return;

  // Cache-first for static assets (images, fonts, etc.)
  if (e.request.destination === 'image' || e.request.destination === 'font') {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Network-first for HTML pages — fallback to cached index.html
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match('/index.html')
    )
  );
});
