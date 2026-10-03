"use client";

import { useEffect } from "react";

/**
 * Registers the notifications service worker on first load so the app meets
 * Chrome's PWA installability criteria out of the box (manifest + icons +
 * a registered SW with a fetch handler). The SW is inert except for push
 * notifications; registering early also makes push enabling instant and
 * means installs work for users who never enable notifications.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Dev servers (Turbopack) must not be served through the SW's cache-first
    // static handler — it made `next dev` feel slow and showed stale builds
    // after branch switches. Register only in production builds.
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/notifications-sw.js", { scope: "/" })
      .catch(() => {
        // Non-fatal: push notifications simply stay unavailable.
      });
  }, []);

  return null;
}
