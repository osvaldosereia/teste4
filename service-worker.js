
const VERSION = 'v1.0.1';
const CORE = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json',
  '/offline.html',
  '/icons/pwa-192.png', '/icons/pwa-512.png'
];
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==VERSION?caches.delete(k):null))));
  self.clients.claim();
});
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  // Network-first for HTML
  if(e.request.mode === 'navigate' || (e.request.headers.get('accept')||'').includes('text/html')){
    e.respondWith(fetch(e.request).then(r=>{
      const copy = r.clone();
      caches.open(VERSION).then(c=>c.put(e.request, copy));
      return r;
    }).catch(()=>caches.match(e.request).then(r=> r || caches.match('/offline.html'))));
    return;
  }
  // Cache-first for assets and JSON
  e.respondWith(caches.match(e.request).then(cacheRes=>{
    return cacheRes || fetch(e.request).then(netRes=>{
      const copy = netRes.clone();
      caches.open(VERSION).then(c=>c.put(e.request, copy));
      return netRes;
    });
  }));
});
