// SafeDive Coach service worker: the whole app, model included, is cached on first visit so it works at the pool with no signal.
// Cache-first for everything in PRECACHE (all same-origin, all versioned by CACHE); anything else goes to the network.
// Bump CACHE whenever a file in the list changes; the old cache is deleted on activate.
const CACHE = 'safedive-v0.4.2';   // the careful model (40 MB) is NOT precached: it is fetched on demand and then kept by the cache-first rule
const PRECACHE = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/pose_yolo.js', './js/metrics.js', './js/scoring.js', './js/drills.js', './js/examples.js', './js/store.js', './js/badges.js', './js/safety.js', './js/plan.js', './js/share.js', './js/track.js', './js/draw.js', './js/report.js', './js/live.js', './js/app.js',
  './vendor/ort/ort.min.js', './vendor/ort/ort-wasm-simd-threaded.jsep.mjs', './vendor/ort/ort-wasm-simd-threaded.jsep.wasm', './vendor/ort/ort-wasm-simd-threaded.mjs', './vendor/ort/ort-wasm-simd-threaded.wasm',
  './vendor/fonts/BricolageGrotesque-Variable.woff2', './vendor/fonts/AtkinsonHyperlegible-Regular.woff2', './vendor/fonts/AtkinsonHyperlegible-Bold.woff2',
  './models/yolo/yolo11n-pose.onnx', './assets/study_clips.json', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './assets/examples/backstroke_lap.jpg', './assets/examples/flat_float.jpg', './assets/examples/treading.jpg', './assets/examples/body_dropped.jpg', './assets/examples/standing_wall.jpg', './assets/examples/deck_freestyle.jpg',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(PRECACHE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Heavy, versioned files (model, wasm, fonts, photos) are served from the cache first: they never change without a new CACHE name.
// Everything else (html, css, js, json) is network-first with the cache as the offline fallback, so an update shows up on the next visit.
const HEAVY = /\.(onnx|wasm|mjs|woff2|jpg|png|svg)$/;
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.headers.has('range')) return;                           // video seeking: let the browser talk to the server directly
  const put = res => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; };
  if (HEAVY.test(url.pathname)) e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(put)));
  else e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
