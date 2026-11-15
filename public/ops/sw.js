/* Ops navigation only. Never cache staff, customer, booking or payment data. */
const CACHE='werigo-ops-offline-v1',OFFLINE='/ops/offline.html';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.add(OFFLINE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('werigo-ops-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||event.request.mode!=='navigate'||url.origin!==self.location.origin||!(url.pathname==='/ops'||url.pathname.startsWith('/ops/')))return;event.respondWith(fetch(event.request).catch(async()=>await caches.match(OFFLINE)||Response.error()));});
