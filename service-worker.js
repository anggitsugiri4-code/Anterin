/**
 * service-worker.js — Anterin (PWA)
 *
 * Cuma nge-cache "app shell" (HTML/manifest/icon) biar bisa diinstall +
 * kebuka walau internet lemah. SENGAJA TIDAK cache request ke BACKEND_URL
 * (Google Apps Script) — katalog produk & submit pesanan WAJIB selalu data
 * terbaru dari server, cache di sini cuma bikin stok/harga basi atau pesanan
 * ke-submit ganda. Naikin CACHE_VERSION tiap kali index.html
 * diupdate supaya user lama otomatis ke-refresh cache-nya.
 */
const CACHE_VERSION = 'Anterin-shell-v2';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;

  // Jangan pernah campur tangan request ke backend Apps Script (POST katalog/
  // checkout) — selalu langsung ke jaringan, tidak pernah dari cache.
  if (req.method !== 'GET' || req.url.indexOf('script.google.com') !== -1) {
    return;
  }

  // App shell: cache-first (buka instan + tetap kebuka offline), lalu diam-diam
  // update cache di background kalau jaringan ada (stale-while-revalidate).
  event.respondWith(
    caches.match(req).then(function (cached) {
      const networkFetch = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, clone); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
