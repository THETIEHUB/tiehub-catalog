// Minimal service worker for the installable web app.
// Network-first for the page itself (so updates always show up straight away),
// cached copy only as an offline fallback. Never touches anything from another
// origin — the Apps Script backend, images and CDN libraries pass straight
// through, so data is never served stale.
var CACHE = 'tth-shell-v1';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(SHELL); }).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, {cache: 'no-cache'}).then(function(res) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put('index.html', copy); });
        return res;
      }).catch(function() {
        return caches.match('index.html').then(function(hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }

  e.respondWith(caches.match(req).then(function(hit) { return hit || fetch(req); }));
});
