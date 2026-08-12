const CACHE_NAME = "dentledger-v1";
const ASSETS = [
  "index.html",
  "styles.css",
  "renderer.js",
  "web-api.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js",
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage-compat.js"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Stale-While-Revalidate strategy)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Bypass sync endpoints, dynamic Google Auth calls, or RTDB syncs
  if (
    e.request.url.includes("googleapis.com") ||
    e.request.url.includes("firebaseio.com") ||
    e.request.url.includes("google_access_token")
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update the cache with fresh version
        fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, networkResponse);
              });
            }
          })
          .catch(() => {
            /* Silence background update errors when offline */
          });
        return cachedResponse;
      }

      return fetch(e.request).catch(() => {
        // Fallback to index.html if document navigation fails offline
        if (e.request.mode === "navigate") {
          return caches.match("index.html");
        }
      });
    })
  );
});
