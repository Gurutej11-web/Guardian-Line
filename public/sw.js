// Guardian Line service worker — deliberately minimal. It does not try
// to cache the whole app (Next.js dev/build asset hashes make a naive
// cache-everything strategy fragile and easy to get stuck serving stale
// JS). Its one job: if a navigation request fails because the network
// is down, serve the offline fallback page instead of the browser's
// generic "no internet" screen — the app is local-first already, so
// most of it should still work.

const OFFLINE_URL = "/offline.html";
const CACHE_NAME = "guardian-line-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
