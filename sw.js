/* Default Dinner — offline support.
   Keeps a copy of the whole app on the device. The version string changes
   with every build, so a new build is downloaded in the background the next
   time the phone is online and used from the following launch. */
const VERSION = 'fd8a6496eb65';
const CACHE = 'default-dinner-' + VERSION;
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./fonts/ibm-plex-mono-400.woff2", "./fonts/ibm-plex-mono-500.woff2", "./fonts/ibm-plex-mono-600.woff2", "./fonts/schibsted-grotesk.woff2"];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
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

  // Opening the app: always answer from the saved copy so it starts without a connection.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match('./index.html').then(hit => hit || fetch(req).catch(() => cache.match('./')))
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
