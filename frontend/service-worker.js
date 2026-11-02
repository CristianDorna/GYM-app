const CACHE_NAME = "urbanfit-app-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./crear.html",
  "./entrenamiento.html",
  "./styles.css?v=11",
  "./supabase-config.js?v=1",
  "./app.js?v=4",
  "./manifest.webmanifest",
  "./data/exercises.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("urbanfit-app-") && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const fallbackUrl = new URL(requestUrl.pathname, self.location.origin);
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) return response;
          return caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(fallbackUrl.href, response.clone()))
            .then(() => response);
        })
        .catch(async () => {
          const cachedPage = await caches.match(fallbackUrl.href);
          return cachedPage || caches.match("./index.html");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((response) => {
        if (!response.ok) return response;
        return caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, response.clone()))
          .then(() => response);
      });
    }),
  );
});
