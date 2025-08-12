// Service Worker for Gametriq PWA
const CACHE_NAME = 'gametriq-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // API responses - Network first, fallback to cache
  api: {
    pattern: /^\/api\//,
    strategy: 'NetworkFirst',
    cacheName: 'gametriq-api',
    maxAge: 5 * 60, // 5 minutes
  },
  // Static assets - Cache first
  static: {
    pattern: /\.(js|css|png|jpg|jpeg|svg|ico)$/,
    strategy: 'CacheFirst',
    cacheName: 'gametriq-static',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // HTML pages - Network first for freshness
  pages: {
    pattern: /\.html$/,
    strategy: 'NetworkFirst',
    cacheName: 'gametriq-pages',
    maxAge: 60 * 60, // 1 hour
  },
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('gametriq-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Find matching cache strategy
  const strategy = Object.values(CACHE_STRATEGIES).find((s) =>
    s.pattern.test(url.pathname)
  );

  if (strategy) {
    event.respondWith(handleRequest(request, strategy));
  } else {
    // Default to network first
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

// Cache strategy implementations
async function handleRequest(request, strategy) {
  const cacheName = strategy.cacheName;

  switch (strategy.strategy) {
    case 'CacheFirst':
      return cacheFirst(request, cacheName);
    case 'NetworkFirst':
      return networkFirst(request, cacheName);
    default:
      return fetch(request);
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(OFFLINE_URL);
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

// Handle push notifications (foundation for future)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New update from Gametriq',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification('Gametriq League', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});