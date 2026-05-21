/* Service Worker for EVA Monitor Kiosk — offline caching + sync */
const CACHE_NAME = 'eva-monitor-v1';
const ASSETS = [
  '/kiosk/',
  '/kiosk/index.html',
  '/kiosk/css/main.css',
  '/kiosk/css/station-selector.css',
  '/kiosk/css/team-checkin.css',
  '/kiosk/css/break-overlay.css',
  '/kiosk/css/cycle-done.css',
  '/kiosk/css/eva-mix.css',
  '/kiosk/css/defect-report.css',
  '/kiosk/css/downtime.css',
  '/kiosk/css/components.css',
  '/kiosk/js/app.js',
  '/kiosk/js/api.js',
  '/kiosk/js/db.js',
  '/kiosk/js/utils/toast.js',
  '/kiosk/js/utils/material-picker.js',
  '/kiosk/js/screens/shift-start.js',
  '/kiosk/js/screens/team-checkin.js',
  '/kiosk/js/screens/station-selector.js',
  '/kiosk/js/screens/station-menu.js',
  '/kiosk/js/screens/cycle-done.js',
  '/kiosk/js/screens/eva-mix.js',
  '/kiosk/js/screens/defect-report.js',
  '/kiosk/js/screens/downtime.js',
  '/kiosk/js/screens/team-roster.js',
  '/kiosk/js/screens/role-reassign.js'
];

// Install — cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first for static, network first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    // Network first for API calls
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return offline response for GET requests
        if (event.request.method === 'GET') {
          return caches.match(event.request);
        }
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'eva-sync') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Notify clients to sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC' }));
}
