const CACHE_NAME = 'mh-mini-mart-pwa-v1';

// Static core assets to cache during installation
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './mh-favico.jpeg'
];

// 1. Install event: Pre-cache App Shell with individual error resilience
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Pre-cache warning for asset:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate event: Clean up previous version caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch event: Stale-While-Revalidate for assets, Network-first for routes, Bypass /api/
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle http and https requests (ignore chrome-extension://, brave://, blob:, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Bypass API requests and external telemetry
  if (url.pathname.includes('/api/') || url.pathname.includes('/backend/')) {
    return;
  }

  // Handle SPA Navigation requests (Network-first with offline fallback to index.html)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // If offline, serve cached index.html SPA entry point
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse =
            (await cache.match(request)) ||
            (await cache.match('./index.html')) ||
            (await cache.match('/index.html')) ||
            (await cache.match('./')) ||
            (await cache.match('/'));

          if (cachedResponse) {
            return cachedResponse;
          }

          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><title>MH Mini Mart - Offline</title></head>
            <body style="font-family:sans-serif;text-align:center;padding:50px;">
              <h2>MH Mini Mart is in Offline Mode</h2>
              <p>Please open the app when online once, or reload the page.</p>
              <button onclick="window.location.reload()" style="padding:10px 20px;cursor:pointer;">Retry</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Images, Fonts, Icons)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Background fetch to update cache (Stale-While-Revalidate)
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {
              // Ignore network failure when offline
            });
          return cachedResponse;
        }

        // Not in cache, fetch from network and cache for offline use
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Asset unavailable offline and not cached
            return new Response('', { status: 408, statusText: 'Offline Asset Unavailable' });
          });
      })
    );
  }
});
