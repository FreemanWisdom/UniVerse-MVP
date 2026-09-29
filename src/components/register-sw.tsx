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
    navigator.serviceWorker
      .register("/notifications-sw.js", { scope: "/" })
      .catch(() => {
        // Non-fatal: push notifications simply stay unavailable.
      });
  }, []);

  return null;
}
