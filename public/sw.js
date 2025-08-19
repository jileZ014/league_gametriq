// Service Worker for GameTriq PWA
// Version: 1.0.0

const CACHE_VERSION = 'v1';
const CACHE_NAME = `gametriq-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gametriq-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `gametriq-images-${CACHE_VERSION}`;
const API_CACHE = `gametriq-api-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/schedule',
  '/teams',
  '/scores',
  '/manifest.webmanifest',
  '/offline.html'
];

// API endpoints to cache
const API_ROUTES = [
  '/api/teams',
  '/api/schedule',
  '/api/standings',
  '/api/players'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('Service Worker installed');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('gametriq-') && !cacheName.includes(CACHE_VERSION);
          })
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other static assets
  event.respondWith(handleStaticRequest(request));
});

// Network-first strategy for API requests with fallback to cache
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Clone the response before caching
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, falling back to cache:', error);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a custom offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'You are offline', 
        cached: false,
        timestamp: Date.now() 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-Cache': 'MISS'
        })
      }
    );
  }
}

// Cache-first strategy for images
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached image and update in background
    event.waitUntil(updateImageCache(request, cache));
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // Return placeholder image if offline
    return caches.match('/images/placeholder.png');
  }
}

// Network-first strategy for navigation
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    return caches.match('/offline.html');
  }
}

// Stale-while-revalidate for static assets
async function handleStaticRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Background sync for updating cached images
async function updateImageCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('Background image update failed:', error);
  }
}

// Handle background sync for score updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

async function syncScores() {
  try {
    const response = await fetch('/api/scores/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const scores = await response.json();
      await sendNotification('Score Update', 'Game scores have been updated!');
    }
  } catch (error) {
    console.error('Score sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update from GameTriq',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('GameTriq Update', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic background sync for regular updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-scores') {
    event.waitUntil(updateScoresInBackground());
  }
});

async function updateScoresInBackground() {
  const cache = await caches.open(API_CACHE);
  const endpoints = ['/api/scores/live', '/api/schedule/today'];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        await cache.put(endpoint, response);
      }
    } catch (error) {
      console.error(`Failed to update ${endpoint}:`, error);
    }
  }
}

// Helper function to send notifications
async function sendNotification(title, body) {
  if (self.registration.showNotification) {
    await self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png'
    });
  }
}

// Message handling for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache clearing
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});