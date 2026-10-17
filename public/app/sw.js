/* Cache only the generic offline page. Never persist account, order or payment responses. */
const CACHE = 'werigo-app-offline-v1';
const OFFLINE = '/app/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('werigo-app-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || !url.pathname.startsWith('/app/')) return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
});
