// LIFT Service Worker — PWA for candidate experience
// PWA checklist:
// □ Manifest loads correctly (Chrome DevTools > Application > Manifest)
// □ Service worker registers and activates
// □ Install prompt fires on Android Chrome
// □ iOS Add to Home Screen instructions display on Safari
// □ Session works end-to-end on iPhone SE (375px viewport)
// □ Session works end-to-end on iPad (768px viewport)
// □ Keyboard does not cover textarea on iOS Safari
// □ Offline: response saved to IndexedDB, submitted on reconnect
// □ No double-tap zoom on any interactive element
// □ All touch targets >= 44×44px
// □ Safe area insets respected on iPhone 14 Pro (Dynamic Island)

const CACHE_NAME = "lift-v1";
const STATIC_ASSETS = [
  "/manifest.json",
  "/LIFT LOGO.jpeg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (let POSTs go to network, handled by offline queue in client)
  if (event.request.method !== "GET") return;

  // Static assets: Cache First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Images: Cache First, 30 day expiry
  if (
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Candidate pages: Network First with cache fallback
  if (
    url.pathname.startsWith("/invite/") ||
    url.pathname.startsWith("/consent/") ||
    url.pathname.startsWith("/session/")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: Network only
});
