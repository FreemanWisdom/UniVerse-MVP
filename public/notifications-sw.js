/* UniVerse ICOS Web Push service worker.
   Ported from the legacy dashboard's notifications-sw.js (framework-agnostic).
   One documented adjustment: background push payloads carry legacy routes
   (e.g. /dashboard.html) because notification rows are created server-side
   with legacy links. Those now fall back to the app root instead of 404ing. */
/* Offline strategy (Phase 6, minimal by design):
   - Navigations are network-first; on failure the SW serves the
     self-contained /offline.html fallback (no runtime data caching).
   - Same-origin static assets (/_next/static, /icons, manifest, favicon)
     are cached at runtime, cache-first with background revalidation.
   - Everything else — notably all Supabase API/auth/storage requests —
     passes straight through and fails naturally when offline. Campus data
     is never served from cache: it is scoped, moderated, and
     rate-limited, so stale content or stale auth state must not render. */
const SHELL_CACHE = "universe-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase etc.: pass through

  if (req.mode === "navigate") {
    // Network-first navigation with offline fallback.
    event.respondWith(
      fetch(req).catch(() =>
        caches
          .match(OFFLINE_URL, { cacheName: SHELL_CACHE })
          .then((r) => r || Response.error())
      )
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === OFFLINE_URL
  ) {
    // Cache-first for immutable static assets; refresh in the background.
    event.respondWith(
      caches.match(req, { cacheName: SHELL_CACHE }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      })
    );
  }
});


self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    try {
      data = { body: event.data ? event.data.text() : "" };
    } catch (__) {}
  }
  const title = data.title || "UniVerse ICOS";
  const options = {
    body: data.body || "You have a new campus update.",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || `universeicos-${data.notificationId || Date.now()}`,
    renotify: true,
    data: { link: data.link || "", notificationId: data.notificationId || "" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawLink = event.notification?.data?.link || "/";
  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const target = new URL(rawLink, self.location.origin);
      // Legacy .html routes do not exist in this app; land on the root.
      if (target.pathname.endsWith(".html")) target.pathname = "/";
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            await client.navigate(target.href);
          } catch (_) {}
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target.href);
    })()
  );
});
