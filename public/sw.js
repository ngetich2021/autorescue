// Minimal service worker — Chrome won't fire `beforeinstallprompt` (the
// event components/install-button.tsx listens for) unless a service worker
// with a fetch handler is registered, even a pass-through one like this.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
