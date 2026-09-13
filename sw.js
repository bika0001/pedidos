/* BIKA — service worker
   Une seule stratégie : RÉSEAU D'ABORD, cache en secours.
   - Avec réseau : toujours la dernière version (tu modifies menu.json, c'est en ligne tout de suite).
   - Sans réseau : la dernière version vue est servie depuis le cache (la carte reste consultable).
   Rien à modifier ici quand tu changes la carte ou les réglages. */
const CACHE = 'bika-v4';
const TIMEOUT_MS = 3000;
const PRECACHE = [
  './',
  './index.html',
  './salao',
  './salao.html',
  './css/app.css',
  './js/i18n.js',
  './js/app.js',
  './data/menu.json',
  './data/config.json',
  './data/config.salao.json',
  './manifest.webmanifest',
  './manifest.salao.webmanifest',
  './assets/logo-navy.png',
  './assets/mascot-orange.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// Cloudflare Pages redirige /salao.html vers /salao et /index.html vers /.
// Une réponse « redirigée » gardée en cache ne peut pas servir une page hors ligne :
// on en garde une copie propre.
function clean(res) {
  if (!res || !res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(PRECACHE.map((u) =>
        fetch(new Request(u, { cache: 'reload' })).then((r) => (r.ok ? c.put(u, clean(r)) : null)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
  if (!sameOrigin && !isFont) return; // WhatsApp, Maps, Instagram : jamais interceptés

  // Les fichiers data/ sont demandés avec ?v=<horodatage> : une seule entrée par fichier,
  // sinon le cache grossit à chaque visite et le secours renvoie la plus vieille copie.
  const key = sameOrigin && url.pathname.includes('/data/') ? url.origin + url.pathname : req;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const network = await Promise.race([
        fetch(req),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
      ]);
      if (network && network.status === 200 && (network.type === 'basic' || network.type === 'cors')) {
        cache.put(key, clean(network.clone()));
      }
      return network;
    } catch (e) {
      const cached = await cache.match(key, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        // la versão salão fica offline com a sua própria página
        const salon = /\/salao(\.html)?$/.test(url.pathname);
        const shell = (await cache.match(salon ? './salao' : './', { ignoreSearch: true })) ||
          (await cache.match(salon ? './salao.html' : './index.html', { ignoreSearch: true }));
        if (shell) return shell;
      }
      throw e;
    }
  })());
});
