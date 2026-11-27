/*
 * VerseVille service worker: makes the app open offline after the first visit.
 *   - On install: saves the app shell plus every built file listed in
 *     /precache-manifest.json (written by vite.config.ts), so all screens work offline.
 *   - Page navigations: try the network, fall back to the cached app shell.
 *   - Other same-origin files (scripts, styles, fonts, icons): serve from cache
 *     straight away and refresh the cache in the background.
 * Game progress is never stored here — it lives in IndexedDB.
 * Bump CACHE_VERSION to drop old caches after big changes.
 */
const CACHE_VERSION = 'verseville-v3'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

async function precache() {
  const cache = await caches.open(CACHE_VERSION)
  await cache.addAll(APP_SHELL)
  try {
    const response = await fetch('/precache-manifest.json', { cache: 'no-store' })
    if (response.ok) {
      const { files } = await response.json()
      await cache.addAll(files)
    }
  } catch {
    // Offline during install: files will be cached as they are used instead.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html', { ignoreVary: true })),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // ignoreVary: hosts often send "Vary: Origin"; module scripts are requested with an
      // Origin header but were cached without one, which would otherwise never match.
      const cached = await cache.match(request, { ignoreVary: true })
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached || refresh
    }),
  )
})
