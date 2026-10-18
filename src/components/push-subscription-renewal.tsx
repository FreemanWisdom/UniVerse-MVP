"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { renewStalePushSubscription } from "@/services/notifications/notification.service";

/**
 * Silently repairs push subscriptions created with a retired VAPID key.
 *
 * On Oct 15 2026 the server's VAPID keypair was replaced (phase 9). Devices
 * that enabled push before then hold subscriptions the push service can no
 * longer deliver to: pushes signed with the new key are rejected. This runs
 * once per logged-in load for permission-granted devices and re-subscribes
 * them with the current key. No permission prompt can appear here —
 * permission was already granted, only the subscription is refreshed.
 *
 * Phase 11: staleness is now detected via a per-device VAPID version marker
 * (see notification.service.ts), which also catches devices whose browsers
 * do not expose subscription.applicationServerKey (Safari/iOS, some
 * Windows browsers) — exactly the devices that stayed broken after the
 * rotation.
 */
export function PushSubscriptionRenewal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    let cancelled = false;

    const run = async () => {
      try {
        const supabase = createClient();
        const result = await renewStalePushSubscription(supabase);
        if (!cancelled && result === "renewed") {
          console.info("[push] subscription renewed with the current VAPID key");
        }
      } catch {
        // Non-fatal: the Settings page can always re-enable manually.
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
