// Praca offline: zapisuje całą aplikację, mapy i flagi w pamięci podręcznej.
const VERSION = 'globtroter-v2';
const SHELL = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'precache.json',
  'js/main.js', 'js/nav.js', 'js/util.js', 'js/data.js', 'js/store.js', 'js/match.js', 'js/fx.js', 'js/svgmap.js',
  'js/ui-home.js', 'js/ui-setup.js', 'js/ui-quiz.js', 'js/ui-maps.js', 'js/ui-mapgame.js', 'js/ui-atlas.js', 'js/ui-badges.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    try {
      const list = await (await fetch('precache.json', { cache: 'no-cache' })).json();
      await c.addAll(list);
    } catch (err) { /* reszta dociągnie się przy pierwszym użyciu */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Kod aplikacji: najpierw sieć (żeby aktualizacje docierały), bez sieci z pamięci.
// Flagi i mapy: od razu z pamięci, w tle odświeżane.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isAsset = /\/(flags|data|icons)\//.test(url.pathname);
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    if (isAsset) {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || Response.error();
    }
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
