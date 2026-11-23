// Offline cache for the web/PWA build (not used inside the Android app).
const CACHE = 'bloomguard-v4';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'js/main.js', 'js/game.js', 'js/data.js', 'js/art.js', 'js/audio.js', 'js/save.js', 'js/gamepad.js', 'js/story.js', 'js/cinema.js', 'js/bonk.js', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))));
