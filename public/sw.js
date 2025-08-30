
const CACHE_NAME = 'hotel-zen-pos-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache with stale-while-revalidate
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached version or fetch from network
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Update cache with fresh response
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          });

          // Return cached response immediately, or wait for network
          return response || fetchPromise;
        })
    );
  }
});

// Background sync for offline mutations
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  // Process queued POST/PUT/DELETE requests to Supabase
  const db = await openDB();
  const tx = db.transaction(['queue'], 'readwrite');
  const store = tx.objectStore('queue');
  const requests = await store.getAll();

  for (const request of requests) {
    try {
      await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      await store.delete(request.id);
    } catch (error) {
      console.error('Failed to sync request:', error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('offline-queue', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
  });
}
