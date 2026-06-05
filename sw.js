var CACHE_NAME = '3pizzle-v10';
var CACHE_URLS = [
  './',
  './index.html',
  './effects.js',
  './match3_levels.js',
  './match3.js',
  './main.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './assets/gem_red.png',
  './assets/gem_green.png',
  './assets/gem_orange.png',
  './assets/gem_purple.png',
  './assets/gem_blue.png',
  './assets/gem_pink.png',
  './assets/world1_forest.png',
  './assets/world2_cave.png',
  './assets/world3_volcano.png',
  './assets/world4_sky.png',
  './assets/world5_space.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});