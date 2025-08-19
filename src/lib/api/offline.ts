// Offline-aware API utilities

interface CacheOptions {
  cacheName?: string
  maxAge?: number // in seconds
  forceRefresh?: boolean
}

/**
 * Fetch with offline support and caching
 */
export async function fetchWithCache(
  url: string,
  options: RequestInit & CacheOptions = {}
): Promise<Response> {
  const {
    cacheName = 'api-cache',
    maxAge = 300, // 5 minutes default
    forceRefresh = false,
    ...fetchOptions
  } = options

  // Check if we're offline
  if (!navigator.onLine && !forceRefresh) {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(url)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    throw new Error('No cached data available offline')
  }

  try {
    // Try network first
    const response = await fetch(url, fetchOptions)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName)
      const responseToCache = response.clone()
      
      // Add cache headers
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cache-time', Date.now().toString())
      headers.set('sw-cache-max-age', maxAge.toString())
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      })
      
      await cache.put(url, cachedResponse)
    }
    
    return response
  } catch (error) {
    // If network fails, try cache
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(url)
    
    if (cachedResponse) {
      // Check if cache is still valid
      const cacheTime = parseInt(cachedResponse.headers.get('sw-cache-time') || '0')
      const cacheMaxAge = parseInt(cachedResponse.headers.get('sw-cache-max-age') || '0')
      const isExpired = Date.now() - cacheTime > cacheMaxAge * 1000
      
      if (!isExpired || !navigator.onLine) {
        return cachedResponse
      }
    }
    
    throw error
  }
}

/**
 * Queue a request for background sync
 */
export async function queueRequest(
  url: string,
  options: RequestInit = {}
): Promise<void> {
  if (!('sync' in self.registration)) {
    throw new Error('Background sync not supported')
  }

  // Store request in IndexedDB
  const db = await openDB()
  const tx = db.transaction(['sync-queue'], 'readwrite')
  const store = tx.objectStore('sync-queue')
  
  await store.add({
    url,
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
    timestamp: Date.now()
  })
  
  // Register for background sync
  await (self.registration as any).sync.register('api-sync')
}

/**
 * Clear old cached data
 */
export async function clearOldCache(
  cacheName: string = 'api-cache',
  maxAge: number = 86400 // 24 hours
): Promise<void> {
  const cache = await caches.open(cacheName)
  const requests = await cache.keys()
  
  for (const request of requests) {
    const response = await cache.match(request)
    if (response) {
      const cacheTime = parseInt(response.headers.get('sw-cache-time') || '0')
      const age = Date.now() - cacheTime
      
      if (age > maxAge * 1000) {
        await cache.delete(request)
      }
    }
  }
}

/**
 * Prefetch and cache important data
 */
export async function prefetchData(urls: string[]): Promise<void> {
  const cache = await caches.open('prefetch-cache')
  
  const promises = urls.map(async (url) => {
    try {
      const response = await fetch(url)
      if (response.ok) {
        await cache.put(url, response)
      }
    } catch (error) {
      console.error(`Failed to prefetch ${url}:`, error)
    }
  })
  
  await Promise.all(promises)
}

// Helper to open IndexedDB
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gametriq-offline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
      }
    }
  })
}