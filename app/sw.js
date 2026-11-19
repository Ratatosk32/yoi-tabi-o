// Service Worker (same-origin separate file — Blob SWs are not allowed, PLAN.md 2d).
// Bump VERSION whenever app files change — the browser sees a new sw.js
// and the app offers "Update" (no silent reloads).
const VERSION = 'v17';
const CACHE = `jt-${VERSION}`;
// Dictionary (JMdict) files: their own cache, cache-first, NOT part of the shell precache. Bump with the data
// (dictDate) only: a shell update does not re-download the dictionary, a dictionary update does not touch the shell.
const DICT_CACHE = 'dict-2026-11-16';
const DICT_FILES = /\/data\/dict-(core|rest)\.json$/;

const PRECACHE = [
  './',
  'fonts/fonts.css',
  'fonts/shippori-mincho-500.kana.woff2',
  'fonts/shippori-mincho-500.kanji.woff2',
  'fonts/lora-var.woff2',
  'tokens.css',
  'components.css',
  'app.js',
  'manifest.webmanifest',
  'diag',
  'modules/curriculum.js',
  'modules/dict-search.js',
  'modules/dict.js',
  'modules/view-dict.js',
  'modules/launchers.js',
  'modules/numbers.js',
  'modules/srs.js',
  'modules/study-session.js',
  'modules/snapshots.js',
  'modules/store.js',
  'modules/text.js',
  'modules/tts.js',
  'modules/updates.js',
  'modules/ui.js',
  'modules/view-kanji.js',
  'modules/view-lessons.js',
  'modules/view-phrases.js',
  'modules/view-show.js',
  'modules/view-study.js',
  'modules/view-tools.js',
  'data/curriculum.json',
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
    // cache: 'reload' — bypass the HTTP cache so a stale file is never precached
    await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })));
    // v5 replaces a broken v4 (redirected navigation responses): take over at once so the app can load at all.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => (k.startsWith('jt-') && k !== CACHE) || (k.startsWith('dict-') && k !== DICT_CACHE)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'version') event.ports[0]?.postMessage(VERSION); // Tools: "App version v.."
  // The page loaded the dictionary (maybe before this SW controlled it): make sure both files are in the
  // dictionary cache, so it works offline from now on. Usually a no-op or an HTTP-cache hit.
  if (event.data === 'cacheDict') event.waitUntil(fillDict());
});

async function fillDict() {
  const cache = await caches.open(DICT_CACHE);
  for (const f of ['data/dict-core.json', 'data/dict-rest.json']) {
    const url = new URL(f, self.registration.scope).href;
    if (await cache.match(url)) continue;
    try {
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res);
    } catch { /* offline: try again next time */ }
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // external requests — network only

  // Navigation: app shell from cache (offline), else network
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      // Cloudflare Pages redirects /index.html -> / and /diag.html -> /diag: cache the final URLs only,
      // and never hand a redirected response to a navigation (Chrome rejects it).
      const path = /\/diag(\.html)?$/.test(url.pathname) ? 'diag' : './';
      let res = await cache.match(path);
      if (res && res.redirected) res = new Response(await res.blob(), { headers: res.headers, status: 200 });
      if (res) return res;
      try { return await fetch(req); } catch (e) { return Response.error(); }
    })());
    return;
  }

  // Dictionary: cache-first in its own cache (downloaded once, then offline)
  if (DICT_FILES.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(DICT_CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // Data: stale-while-revalidate (serve cache, refresh in the background)
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

  // Everything else (shell, modules, vendor, icons): cache-first
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
