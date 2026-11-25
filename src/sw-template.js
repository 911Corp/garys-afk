/* Gary's AFK service worker. Generated at build time: the version and the precache list are injected by vite.config.ts. */
const VERSION = '__VERSION__'
const CACHE = `garys-afk-${VERSION}`
const FILES = __FILES__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // One file failing (e.g. a flaky network) must not leave the app without a cache: add them one by one.
      Promise.all(FILES.map((f) => cache.add(new Request(f, { cache: 'reload' })).catch(() => undefined))),
    ),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
  if (event.data === 'version') event.source?.postMessage({ type: 'version', version: VERSION })
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('garys-afk-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
          .catch(() => (req.mode === 'navigate' ? caches.match('./', { ignoreVary: true }) : Response.error())),
    ),
  )
})
