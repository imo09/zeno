/* zeno - service worker generato da tools/build.py: cache dell'app per l'uso offline */
const VERSION = 'zeno-5fd07baeac';
const ASSETS = [
  'index.html',
  'css/zeno.css',
  'fonts/Poppins-600.woff2',
  'fonts/SpaceGrotesk-400.woff2',
  'fonts/SpaceGrotesk-500.woff2',
  'fonts/SpaceGrotesk-600.woff2',
  'fonts/SpaceGrotesk-700.woff2',
  'fonts/SpaceMono-400.woff2',
  'img/apple-touch-icon.png',
  'img/favicon.svg',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-maskable-512.png',
  'img/maskable.svg',
  'js/app.js',
  'js/board.js',
  'js/colonne.js',
  'js/csv.js',
  'js/dettaglio.js',
  'js/guida.js',
  'js/viste.js',
  'manifest.webmanifest',
  'nucleo/aiuto.js',
  'nucleo/dati.js',
  'nucleo/kv.js',
  'nucleo/shell.js',
  'nucleo/stile.css',
  'nucleo/ui.js',
  'nucleo/util.js'
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map((a) => './' + a))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => { if (resp.ok) { const c = resp.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); } return resp; })));
});
