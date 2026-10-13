const CACHE_NAME = 'hex-app-v3'
const CACHE_PREFIX = 'hex-app-'

const BASE_PATH = '/HEX.app/'

const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL)
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)

  if (
    requestUrl.origin !== self.location.origin ||
    !requestUrl.pathname.startsWith(BASE_PATH)
  ) {
    return
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)

        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const cacheUpdate = caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()))
          event.waitUntil(cacheUpdate)
        }

        return response
      } catch (error) {
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = await cache.match(request)

        if (cachedResponse) {
          return cachedResponse
        }

        if (request.mode === 'navigate') {
          const appShell = await cache.match(`${BASE_PATH}index.html`)

          if (appShell) {
            return appShell
          }
        }

        throw error
      }
    })()
  )
})
