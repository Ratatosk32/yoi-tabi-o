// Service Worker (same-origin, отдельный файл — Blob-SW запрещены, PLAN.md 2d).
// При каждом изменении файлов приложения увеличивайте VERSION — браузер увидит новый sw.js
// и предложит пользователю «Обновить» (без тихих перезагрузок).
const VERSION = 'v3';
const CACHE = `jt-${VERSION}`;

const PRECACHE = [
  './',
  'index.html',
  'fonts/fonts.css',
  'fonts/shippori-mincho-500.kana.woff2',
  'fonts/shippori-mincho-500.kanji.woff2',
  'fonts/lora-var.woff2',
  'tokens.css',
  'components.css',
  'app.js',
  'manifest.webmanifest',
  'diag.html',
  'modules/launchers.js',
  'modules/numbers.js',
  'modules/srs.js',
  'modules/store.js',
  'modules/text.js',
  'modules/tts.js',
  'modules/ui.js',
  'modules/view-kanji.js',
  'modules/view-phrases.js',
  'modules/view-show.js',
  'modules/view-study.js',
  'modules/view-tools.js',
  'data/phrases.json',
  'data/kana.json',
  'data/kanji.json',
  'vendor/wanakana.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' — мимо HTTP-кеша, чтобы не закешировать старую версию файла
    await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('jt-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // внешние запросы — только сеть

  // Навигация: оболочка из кеша (офлайн), иначе сеть
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const path = url.pathname.endsWith('/diag.html') ? 'diag.html' : 'index.html';
      return (await cache.match(path)) || fetch(req);
    })());
    return;
  }

  // Данные: stale-while-revalidate (показываем кеш, обновляем в фоне)
  if (url.pathname.includes('/data/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
    })());
    return;
  }

  // Остальное (оболочка, модули, vendor, иконки): cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch {
      return new Response('offline', { status: 503 });
    }
  })());
});
