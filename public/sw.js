const CACHE_NAME = "vita-cache-v2";
const ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") {
    return;
  }
  const url = new URL(e.request.url);
  const acceptHeader = e.request.headers.get("accept");
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.includes("_next/data") ||
    url.searchParams.has("_rsc") ||
    (acceptHeader && acceptHeader.includes("text/html"))
  ) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match("/").then((response) => {
            return response || caches.match(e.request);
          });
        }),
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        if (
          response.status === 200 &&
          (url.origin === self.location.origin ||
            url.pathname.startsWith("/_next/static"))
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, copy);
          });
        }
        return response;
      });
    }),
  );
});
