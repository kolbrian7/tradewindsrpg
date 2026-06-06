const CACHE_NAME = 'tradewinds-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/assets/New Lands/Athens.webp',
  '/assets/New Lands/Barcellona.webp',
  '/assets/New Lands/Crete.webp',
  '/assets/New Lands/Egypt.webp',
  '/assets/New Lands/Nice.webp',
  '/assets/New Lands/Rome.webp',
  '/assets/New Lands/Sardinia.webp',
  '/assets/New Lands/Tunisia.webp',
  '/assets/New Lands/Venice.webp',
  '/assets/New Lands/World Map.webp',
  '/assets/Boat/Boat 1.webp',
  '/assets/Boat/Boat 2.webp',
  '/assets/Boat/Boat 3.webp',
  '/assets/Boat/Boat 4.webp',
  '/assets/Market Transparent.webp',
  '/assets/Transparent Shipyard.webp',
  '/assets/proper cantina.webp',
  '/assets/easy remove boat.webp',
  '/assets/map pin.webp',
  '/assets/telescope.webp'
];

// Install event - cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension scheme or other non-HTTP protocols
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // Check if response is valid before caching
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[Service Worker] Fetch failed, returning cached response if available:', err);
        });

        // Return cached response immediately if it exists, otherwise wait for network
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
