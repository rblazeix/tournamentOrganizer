const CACHE = 'tournoi-v6';
const FILES = ['./', 'index.html', 'styles.css', 'src/draw.js', 'src/score.js', 'src/store.js', 'src/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Cache d'abord (hors-ligne garanti), mise à jour en arrière-plan : la nouvelle version s'applique au lancement suivant.
// Seules les réponses valides (2xx) remplacent le cache : un 404/5xx ne l'écrase jamais.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; });
    if (cached) { refresh.catch(() => {}); return cached; }
    return refresh.catch(() => (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
  }));
});
