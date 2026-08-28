const CACHE_NAME = 'krishirakshak-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.ts',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/model.onnx',
  '/pest-model.onnx',
  '/model_metadata.json',
  '/pest_model_metadata.json'
];

// Install Event - cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache...', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip browser extensions or chrome-extension schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response to save in cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fetch failed (network is offline), attempt to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If offline and request is for a page navigation, we could return a fallback offline shell
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});
