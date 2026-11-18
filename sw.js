// Network-first service worker: always fresh when online, cached copy when offline.
const CACHE = 'gc-v1';
const FILES = [
  "./",
  "css/app.css",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "index.html",
  "js/actions.js",
  "js/audio/engine.js",
  "js/audio/transport.js",
  "js/main.js",
  "js/playback/cursor.js",
  "js/playback/timing.js",
  "js/rhythm/pattern.js",
  "js/rhythm/presets.js",
  "js/rhythm/progression.js",
  "js/store.js",
  "js/synth/karplus.js",
  "js/synth/renderer.js",
  "js/theory/chord.js",
  "js/theory/key.js",
  "js/theory/pitch.js",
  "js/theory/voicer.js",
  "js/ui/barlist.js",
  "js/ui/dom.js",
  "js/ui/header.js",
  "js/ui/sheet.js",
  "manifest.webmanifest"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./'))),
  );
});
