// Service Worker for AQI Calculator PWA
// Implements advanced caching strategies and offline functionality

const CACHE_VERSION = 'aqi-v2.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/App.js',
  '/src/core/StateManager.js',
  '/src/core/EventBus.js',
  '/src/core/Component.js',
  '/src/modules/DataManager.js',
  '/src/modules/AQICalculator.js',
  '/src/modules/SmartSearch.js',
  '/src/modules/CanvasRenderer.js',
  '/src/workers/aqi-calculator-worker.js',
  '/src/components/SearchComponent.js',
  '/src/components/ResultsComponent.js',
  '/src/components/VisualizationComponent.js',
  '/styles.css',
  '/favicon/site.webmanifest',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints with different caching strategies
const API_ENDPOINTS = {
  weather: '/data/2.5/weather',
  air_pollution: '/data/2.5/air_pollution',
  geocoding: '/geo/1.0'
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  static: 24 * 60 * 60 * 1000, // 24 hours
  api: 10 * 60 * 1000, // 10 minutes
  images: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 60 * 60 * 1000 // 1 hour
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🛠️ Installing Service Worker...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      try {
        // Cache static files
        await cache.addAll(STATIC_FILES);
        console.log('✅ Static files cached successfully');
      } catch (error) {
        console.warn('⚠️ Some static files failed to cache:', error);

        // Cache files individually to handle failures gracefully
        for (const file of STATIC_FILES) {
          try {
            await cache.add(file);
          } catch (err) {
            console.warn(`Failed to cache ${file}:`, err);
          }
        }
      }

      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Activating Service Worker...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name =>
        name !== STATIC_CACHE &&
        name !== DYNAMIC_CACHE &&
        name !== API_CACHE &&
        name !== IMAGE_CACHE
      );

      await Promise.all(
        oldCaches.map(cacheName => {
          console.log(`🗑️ Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );

      // Take control of all clients
      await self.clients.claim();
      console.log('✅ Service Worker activated successfully');
    })()
  );
});

// Fetch event - implement intelligent caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different request types
  if (request.method !== 'GET') return;

  // API requests
  if (url.hostname === 'api.openweathermap.org') {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Image requests
  if (request.destination === 'image' || isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Font requests
  if (isFontRequest(request)) {
    event.respondWith(handleFontRequest(request));
    return;
  }

  // HTML requests (navigation)
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(handleHtmlRequest(request));
    return;
  }

  // Static assets - cache first strategy
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request);
    const responseClone = networkResponse.clone();

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.warn('Network failed for API request:', error);

    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('📋 Serving API response from cache');
      return cachedResponse;
    }

    // Return offline response for air pollution data
    if (url.pathname.includes('air_pollution')) {
      return createOfflineResponse({
        message: 'Offline mode: Using cached air quality data',
        offline: true
      });
    }

    throw error;
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);

  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    const responseClone = networkResponse.clone();

    // Cache successful image responses
    if (networkResponse.ok) {
      cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.warn('Failed to fetch image:', error);
    // Return a placeholder or cached version
    return cachedResponse || createPlaceholderImage();
  }
}

// Handle font requests with cache-first strategy
async function handleFontRequest(request) {
  const cache = await caches.open(STATIC_CACHE);

  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('Failed to fetch font:', error);
    throw error;
  }
}

// Handle HTML requests with network-first strategy
async function handleHtmlRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn('Network failed for HTML request:', error);

    // Fallback to cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    return createOfflinePage();
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if cached version is still fresh
    if (isCacheFresh(cachedResponse, CACHE_EXPIRY.static)) {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Return cached version if available
    if (cachedResponse) {
      console.log('📋 Serving stale static asset from cache');
      return cachedResponse;
    }

    throw error;
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

// Push notifications (for future AQI alerts)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon/favicon-192x192.png',
      badge: '/favicon/favicon-72x72.png',
      data: data.url
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Utility functions
function isImageRequest(request) {
  return request.url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)(\?.*)?$/i);
}

function isFontRequest(request) {
  return request.url.match(/\.(woff|woff2|ttf|eot)(\?.*)?$/i) ||
         request.headers.get('accept').includes('font');
}

function isCacheFresh(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;

  const responseDate = new Date(dateHeader);
  const now = new Date();
  const age = now - responseDate;

  return age < maxAge;
}

function createOfflineResponse(data) {
  const jsonResponse = JSON.stringify(data);
  return new Response(jsonResponse, {
    headers: {
      'Content-Type': 'application/json',
      'X-Offline': 'true'
    }
  });
}

function createOfflinePage() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AQI Calculator - Offline</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background: #f0f0f0;
        }
        .offline-content {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #007BFF; }
        p { color: #666; margin: 20px 0; }
        button {
          background: #007BFF;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="offline-content">
        <h1>🌐 You're Offline</h1>
        <p>You can still use the AQI Calculator with cached data. Some features may be limited.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'X-Offline': 'true'
    }
  });
}

function createPlaceholderImage() {
  // Create a simple placeholder SVG
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f0f0f0"/>
      <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#666">Offline</text>
    </svg>
  `;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'X-Offline': 'true'
    }
  });
}

async function syncFailedRequests() {
  console.log('🔄 Syncing failed requests...');

  // Get failed requests from IndexedDB or similar
  // This would need to be implemented based on your app's needs

  console.log('✅ Background sync completed');
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {
    caches: cacheNames.length,
    cacheNames,
    timestamp: Date.now()
  };

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      entries: keys.length,
      urls: keys.map(request => request.url)
    };
  }

  return stats;
}

// Clean up expired cache entries periodically
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupExpiredCache());
  }
});

async function cleanupExpiredCache() {
  console.log('🧹 Cleaning up expired cache entries...');

  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        // Check if entry is expired based on cache type
        let isExpired = false;

        if (cacheName.includes('api')) {
          isExpired = !isCacheFresh(response, CACHE_EXPIRY.api);
        } else if (cacheName.includes('images')) {
          isExpired = !isCacheFresh(response, CACHE_EXPIRY.images);
        }

        if (isExpired) {
          await cache.delete(request);
          console.log(`🗑️ Deleted expired cache entry: ${request.url}`);
        }
      }
    }
  }

  console.log('✅ Cache cleanup completed');
}

// Export for debugging
self.getCacheStats = getCacheStats;

