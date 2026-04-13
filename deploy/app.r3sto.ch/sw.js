// ══════════════════════════════════════════════════════════════════════════════
//  R3STO — Service Worker  ⚠️ KILL SWITCH ⚠️
//  Replaces the previous cache-first SW which froze iPads on a broken bundle.
//  This SW unregisters itself, wipes ALL caches, and forces clients to reload.
//  Keep this version deployed until every device has self-healed, then we can
//  reintroduce a smarter SW with proper versioning.
// ══════════════════════════════════════════════════════════════════════════════

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch (_) {}
    try {
      await self.registration.unregister()
    } catch (_) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const c of clients) {
        try { c.navigate(c.url) } catch (_) {}
      }
    } catch (_) {}
  })())
})

// No fetch handler → browser goes straight to network for everything.
