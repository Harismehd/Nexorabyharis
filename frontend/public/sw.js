const CACHE_NAME = 'nexora-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Network first — always get fresh content
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(err => {
      // If network fails, try cache
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        // If it's a navigation request, show a fallback message instead of crashing
        if (event.request.mode === 'navigate') {
          return new Response('Offline: Network error occurred. Please check your connection.', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        // For other assets/API, re-throw to trigger a standard browser error
        throw err;
      });
    })
  );
});