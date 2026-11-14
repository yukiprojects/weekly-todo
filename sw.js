
const CACHE_NAME = "plan-cache-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.PNG"
];

// インストール時
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_FILES);
    })()
  );
});

// 有効化時
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith("plan-cache-"))
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// ページ読み込み時
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(async response => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./", response.clone());
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match("./");

        if (cached) return cached;

        return new Response(
          "Offline. Please connect to the internet.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      })
  );
});
