const CACHE_NAME = "vita-cache-v1";
const ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
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
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") {
    return;
  }

  const url = new URL(e.request.url);

  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next/data") ||
    (e.request.headers.get("accept") &&
      e.request.headers.get("accept").includes("text/html"))
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
