/* Bubbles Chrome launcher: cache only public bootstrap assets, never wallet, chat or API responses. */
const CACHE = 'bubbles-public-shell-v2';
const SHELL = ['/bubbles-pwa-offline.html', '/assets/bubbles-pwa-oOo.svg', '/assets/bubbles-pwa-192.png', '/assets/bubbles-pwa-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('bubbles-public-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  const url = new URL(req.url);
  // Scope worker technically lives at root but controls only the dedicated Bubbles launch path.
  if (url.origin !== self.location.origin || url.pathname !== '/bubbles-chrome.html') return;
  event.respondWith(fetch(req).catch(async () => {
    const fallback = await caches.match('/bubbles-pwa-offline.html');
    return fallback || Response.error();
  }));
});
