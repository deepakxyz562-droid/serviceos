/*
 * ServiceOS Service Worker (v3)
 * ------------------------------
 * Capabilities:
 *   1. App-shell pre-caching on install (/, /manifest.json, /logo.svg, /icon.svg, /offline.html)
 *   2. Cache cleanup + clients.claim() on activate
 *   3. Fetch strategies:
 *        - Network-first for /api/ (fall back to cache, then offline JSON)
 *        - Stale-while-revalidate for /_next/static/ assets
 *        - Cache-first for images and fonts
 *        - Network-first with cache fallback for HTML navigation, falling back to /offline.html
 *   4. Background Sync: 'serviceos-sync' event notifies all clients to replay queued mutations
 *   5. Push Notifications: parses payload, shows notification with View/Dismiss actions
 *   6. Notification click: focuses existing client (and postMessages data) or opens new client
 *   7. Message listener: SKIP_WAITING activates new SW immediately; CLEAR_CACHE wipes the cache
 */

const CACHE_NAME = 'serviceos-v3';
const OFFLINE_URL = '/offline.html';

// App-shell assets pre-cached on install. All of these MUST exist in /public
// to avoid cache.addAll() rejecting the whole install. We use only files we
// know we ship (SVG icons + the offline page + the app shell URL).
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icon.svg',
  OFFLINE_URL,
];

// ---------------------------------------------------------------------------
// Install — pre-cache the app shell
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => {
        // addAll rejects if ANY asset fails; we log but still install so the
        // SW can be activated and used for runtime caching.
        console.warn('[ServiceOS SW] App-shell precache failed:', err);
      })
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches and claim clients
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch — routing strategies
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Only handle http(s) — skip chrome-extension://, blob:, data:, etc.
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js dev hot-reload and internal dev routes
  if (url.pathname.startsWith('/_next/') && url.pathname.includes('.hot-update')) return;
  if (url.pathname.startsWith('/__nextjs')) return;

  // 1. Network-first for /api/ requests (fall back to cache, then offline JSON)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                JSON.stringify({
                  error: 'offline',
                  message: 'You are offline. Your changes will sync when you reconnect.',
                }),
                {
                  status: 503,
                  statusText: 'Offline',
                  headers: { 'Content-Type': 'application/json' },
                }
              )
          )
        )
    );
    return;
  }

  // 2. Stale-while-revalidate for /_next/static/ assets (immutable build output)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 3. Cache-first for images and fonts
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4. Network-first for navigation (HTML pages), falling back to /offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // 5. Default — stale-while-revalidate for everything else (JS/CSS, etc.)
  event.respondWith(staleWhileRevalidate(request));
});

// ---------------------------------------------------------------------------
// Caching helpers
// ---------------------------------------------------------------------------
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

// ---------------------------------------------------------------------------
// Background Sync — 'serviceos-sync' notifies clients to replay queued mutations
// ---------------------------------------------------------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'serviceos-sync') {
    event.waitUntil(notifyClientsToReplay());
  }
});

async function notifyClientsToReplay() {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  });
  clients.forEach((client) => {
    client.postMessage({
      type: 'SERVICEOS_SYNC',
      tag: 'serviceos-sync',
      timestamp: Date.now(),
    });
  });
}

// ---------------------------------------------------------------------------
// Push Notifications
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    // Payload wasn't JSON — try to use it as plain text
    try {
      payload = { title: 'ServiceOS', body: event.data ? event.data.text() : '' };
    } catch (e2) {
      payload = { title: 'ServiceOS', body: 'You have a new update' };
    }
  }

  const title = payload.title || 'ServiceOS';
  const body = payload.body || '';
  const icon = payload.icon || '/icon.svg';
  const badge = payload.badge || '/icon.svg';
  const tag = payload.tag || 'serviceos-notification';
  const data = payload.data || {};
  const actions =
    'actions' in Notification.prototype
      ? [
          { action: 'view', title: 'View', icon: '/icon.svg' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icon.svg' },
        ]
      : undefined;

  const options = {
    body,
    icon,
    badge,
    tag,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || null,
      type: data.type || 'generic',
      ...data,
    },
    requireInteraction: payload.requireInteraction || false,
    ...(actions ? { actions } : {}),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// Notification click — focus existing client or open new one
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/';
  const notificationData = event.notification.data || {};

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Look for a client whose URL starts with our origin (same app)
      for (const client of allClients) {
        if ('focus' in client) {
          try {
            await client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: event.action || 'view',
              data: notificationData,
            });
            // Navigate the existing client to the target URL if it differs
            if (client.url !== targetUrl && 'navigate' in client) {
              try {
                await client.navigate(targetUrl);
              } catch (e) {
                /* navigate may not be supported — message will handle routing */
              }
            }
            return;
          } catch (e) {
            /* fall through to openWindow */
          }
        }
      }

      // No existing client — open a new window
      if (self.clients.openWindow) {
        try {
          await self.clients.openWindow(targetUrl);
        } catch (e) {
          /* ignore */
        }
      }
    })()
  );
});

// ---------------------------------------------------------------------------
// Message listener — SKIP_WAITING + CLEAR_CACHE
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[ServiceOS SW] Cache cleared');
    });
  }
});
