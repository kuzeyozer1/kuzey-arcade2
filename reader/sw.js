// Kuzey Reader offline support. Bump VERSION when the app files change.
const VERSION = 'reader-v2';
const SHELL = ['./', 'index.html', 'app.js', 'catalog.json', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('reader-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Downloaded books: use the saved copy first (they never change).
  if (url.origin === location.origin && url.pathname.includes('/books/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
    return;
  }
  // App files: network first, saved copy when offline.
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); }
      return res;
    }).catch(() => caches.match(e.request).then(h => h || caches.match('index.html'))));
    return;
  }
  // Fonts: saved copy first.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); }
    return res;
  })));
});
