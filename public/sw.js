const CACHE_NAME = 'hex-app-v4'
const CACHE_PREFIX = 'hex-app-'
const APP_SHELL = ['/', '/index.html', '/manifest.json']
const STATIC_DESTINATIONS = new Set([
  'script',
  'style',
  'image',
  'font',
  'manifest',
])

function isCacheableRequest(request) {
  const url = new URL(request.url)

  return (
    request.mode === 'navigate' ||
    STATIC_DESTINATIONS.has(request.destination) ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/icons.svg'
  )
}

function hasExpectedContentType(request, response) {
  const url = new URL(request.url)
  const contentType = response.headers.get('content-type') || ''

  if (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    return /\btext\/html\b/i.test(contentType)
  }

  if (
    request.destination === 'script' ||
    /\.(?:m?js)$/i.test(url.pathname)
  ) {
    return /\b(?:text|application)\/(?:javascript|ecmascript)\b/i.test(
      contentType,
    )
  }

  if (request.destination === 'style' || /\.css$/i.test(url.pathname)) {
    return /\btext\/css\b/i.test(contentType)
  }

  if (
    request.destination === 'manifest' ||
    url.pathname === '/manifest.json'
  ) {
    return /\b(?:application\/manifest\+json|application\/json)\b/i.test(
      contentType,
    )
  }

  return !/\btext\/html\b/i.test(contentType)
}

async function cacheResponse(cache, request, response) {
  if (
    response.status !== 200 ||
    response.type !== 'basic' ||
    !hasExpectedContentType(request, response)
  ) {
    return
  }

  try {
    await cache.put(request, response.clone())
  } catch (error) {
    console.error('Service worker could not cache a response:', error)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)

      await Promise.all(
        APP_SHELL.map(async (path) => {
          const request = new Request(new URL(path, self.location.origin), {
            cache: 'reload',
          })

          try {
            const response = await fetch(request)
            await cacheResponse(cache, request, response)
          } catch (error) {
            console.warn(`Service worker could not precache ${path}:`, error)
          }
        }),
      )

      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const requestUrl = new URL(request.url)

  if (
    request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    !isCacheableRequest(request)
  ) {
    return
  }

  event.respondWith(
    (async () => {
      let response

      try {
        response = await fetch(request)
      } catch (networkError) {
        try {
          const cache = await caches.open(CACHE_NAME)
          const cachedResponse = await cache.match(request)

          if (cachedResponse) {
            return cachedResponse
          }

          if (request.mode === 'navigate') {
            const appShell =
              (await cache.match(new URL('/', self.location.origin))) ||
              (await cache.match(new URL('/index.html', self.location.origin)))

            if (appShell) {
              return appShell
            }
          }
        } catch (cacheError) {
          console.error('Service worker could not read the cache:', cacheError)
        }

        throw networkError
      }

      if (response.status === 200 && response.type === 'basic') {
        try {
          const cache = await caches.open(CACHE_NAME)
          await cacheResponse(cache, request, response)
        } catch (cacheError) {
          console.error('Service worker could not open the cache:', cacheError)
        }
      }

      return response
    })(),
  )
})
