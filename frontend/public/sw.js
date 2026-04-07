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

// SAFE NETWORK LOGIC: Bypass Service Worker for all fetch requests to prevent "Illegal constructor" crashes.
// The browser will handle networking natively, while the PWA still detects updates when this file changes.
self.addEventListener('fetch', () => {
  return; // No-op: Let the network handle everything normally.
});