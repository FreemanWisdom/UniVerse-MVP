/* UniVerse ICOS Web Push service worker.
   Ported from the legacy dashboard's notifications-sw.js (framework-agnostic).
   One documented adjustment: background push payloads carry legacy routes
   (e.g. /dashboard.html) because notification rows are created server-side
   with legacy links. Those now fall back to the app root instead of 404ing. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
