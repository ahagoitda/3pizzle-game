var CACHE_NAME = '3pizzle-v5';
var CACHE_URLS = [
  './',
  './index.html',
  './effects.js',
  './match3.js',
  './blockpuzzle.js',
  './mahjong.js',
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
  './assets/mahjong_dragon.png',
  './assets/mahjong_phoenix.png',
  './assets/mahjong_lotus.png',
  './assets/mahjong_bamboo.png',
  './assets/mahjong_panda.png',
  './assets/mahjong_yin_yang.png',
  './assets/block_purple.png',
  './assets/block_blue.png',
  './assets/block_green.png',
  './assets/block_orange.png',
  './assets/block_red.png',
  './assets/block_pink.png'
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