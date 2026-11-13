// Caches the arcade so it works offline. Bump VERSION when files change.
const VERSION = 'arcade-v15';
const FILES = ['./', 'index.html', 'snake.html', 'temples.html', 'stack.html', 'dodger.html', 'words.html', 'bandit.html', 'craft.html', 'space.html', 'lab.css', 'pixel.html', 'beats.html', 'piano.html', 'elements.html', 'codes.html', 'timer.html', 'convert.html', 'weather.html', 'fractal.html', 'illusions.html', 'kaleido.html', 'typing.html', 'cards.html', 'mathgym.html', 'planner.html', 'picker.html', 'flags.html', 'voice.html', 'qr.html', 'flipbook.html', 'sosyal.html', 'elementals.html', 'snake-arena.html', 'app-forge.html', 'minecraft/', 'minecraft/index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // live weather must always come from the network
  if (new URL(e.request.url).hostname.endsWith('open-meteo.com')) return;
  const url = new URL(e.request.url);
  // Our own pages: try the network first so new games and apps show up right away, use the saved copy when offline.
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html'))));
    return;
  }
  // Fonts and libraries from other sites rarely change: use the saved copy first.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return res;
  })));
});
