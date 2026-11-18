
const CACHE_NAME = "plan-cache-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.PNG",
  "./common.css",
  "./todo.css",
  "./calendar.css",
  "./goals.css",
  "./script.js"
];


// INSTALL

self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_FILES);
    })()
  );

});


// ACTIVATE

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


// FETCH

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") return;

  // 外部サイトは対象外
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {

      try {

        // まずネットから最新版を取得
        const response = await fetch(request, {
          cache: "no-store"
        });

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;

      } catch(error) {

        // オフラインならキャッシュを使用
        const cached = await caches.match(request);

        if (cached) return cached;

        // ページの場合はトップページを返す
        if (request.mode === "navigate") {

          const fallback = await caches.match("./");

          if (fallback) return fallback;

        }

        return new Response(
          "Offline. Please connect to the internet.",
          {
            status:503,
            headers:{
              "Content-Type":"text/plain; charset=utf-8"
            }
          }
        );

      }

    })()
  );

});
