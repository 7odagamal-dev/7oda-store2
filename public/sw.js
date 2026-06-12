const CACHE_NAME = '7H-old-gold-v1'
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico',
]
const API_CACHE = '7H-api-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== API_CACHE)
          .map((n) => caches.delete(n))
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls — network only, no cache
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Static assets — cache first
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navigation / pages — network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Everything else — network only
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return caches.match('/offline')
  }
}
