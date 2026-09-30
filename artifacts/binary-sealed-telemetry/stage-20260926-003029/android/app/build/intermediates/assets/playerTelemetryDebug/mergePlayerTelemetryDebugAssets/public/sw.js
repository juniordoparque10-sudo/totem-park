const CACHE_NAME = "totem-park-pwa-v3-sealed-telemetry";
// Only explicitly owned, retired app-shell caches may be deleted.
const RETIRED_APP_SHELL_CACHES = new Set(["totem-park-pwa-v1", "totem-park-pwa-v2"]);
const APP_SHELL = [
  "/",
  "/tv",
  "/telemetry-observer.js",
  "/manifest.webmanifest",
  "/manifest-tv.webmanifest",
  "/favicon.png",
  "/icons/site-icon-192.png",
  "/icons/site-icon-512.png",
  "/icons/site-maskable-512.png",
  "/icons/tv-icon-192.png",
  "/icons/tv-icon-512.png",
  "/icons/tv-maskable-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && RETIRED_APP_SHELL_CACHES.has(key))
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    const fallbackUrl = new URL(request.url).pathname.startsWith("/tv") ? "/tv" : "/";

    event.respondWith(
      fetch(request).catch(() => caches.match(fallbackUrl))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        return response;
      });
    })
  );
});
