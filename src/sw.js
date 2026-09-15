/* Default Dinner — offline support.
   Keeps a copy of the whole app on the device. The version string changes
   with every build, so a new build is downloaded in the background the next
   time the phone is online and used from the following launch. */
const VERSION = '__VERSION__';
const CACHE = 'default-dinner-' + VERSION;
const PAGE = './index.html';
const ASSETS = __ASSETS__;

async function precache() {
  // The page itself must be this exact version. A CDN can briefly serve the
  // previous index.html, so check the embedded version and bust the cache if needed.
  let page = null;
  for (const url of [PAGE + '?v=' + VERSION, PAGE + '?v=' + VERSION + '-' + Date.now()]) {
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) continue;
    const html = await res.text();
    if (html.includes('content="' + VERSION + '"')) { page = html; break; }
  }
  if (!page) throw new Error('New version not available yet'); // keep the old copy; try again next launch
  const cache = await caches.open(CACHE);
  const headers = { 'Content-Type': 'text/html; charset=utf-8' };
  await cache.put(PAGE, new Response(page, { headers }));
  await cache.put('./', new Response(page, { headers }));
  // Everything else is best effort: a missing icon or font must not block the update.
  await Promise.allSettled(ASSETS.filter(a => a !== './' && a !== PAGE).map(async url => {
    const res = await fetch(url, { cache: 'reload' });
    if (res.ok) await cache.put(url, res);
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('default-dinner-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Opening the app: answer from the saved copy so it starts without a connection.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(PAGE).then(hit => hit || fetch(req).catch(() => cache.match('./')))
      )
    );
    return;
  }

  // Fonts, icons, manifest: saved copy first, network as a fallback.
  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }))
    )
  );
});
