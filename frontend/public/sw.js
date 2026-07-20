self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A simple fetch handler is required by Chrome to trigger the "Install" prompt
  // We don't cache anything aggressively to avoid offline issues with the dynamic API
});
