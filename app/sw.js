// Service worker: az alkalmazás internet nélkül is megnyílik.
const VERSION = 'sv-3';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/timeline.js', 'js/map.js', 'js/art.js',
  'data/timeline.json', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const RUNTIME = 'sv-runtime';
const TILES = 'sv-tiles';
const MAX_TILES = 600;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => ![VERSION, RUNTIME, TILES].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Adat és oldal: hálózat előbb (friss tartalom), offline esetén gyorsítótár
  if (url.origin === location.origin && (url.pathname.endsWith('.json') || req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/'))) {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Térképcsempék: gyorsítótár előbb, korlátozott mérettel
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trimTiles(); }
      return res;
    }).catch(() => new Response('', { status: 504 })));
    return;
  }

  // Betűk, könyvtárak (Google Fonts, unpkg, jsdelivr): stale-while-revalidate
  if (/fonts\.(googleapis|gstatic)\.com|unpkg\.com|cdn\.jsdelivr\.net/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Saját statikus fájlok: gyorsítótár, háttérben frissítve
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
