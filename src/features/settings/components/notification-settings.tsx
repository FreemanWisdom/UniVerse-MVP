"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  getPushPermissionState,
  enableDevicePush,
  disableDevicePush,
  hasActivePushSubscription,
} from "@/services/notifications/notification.service";

/**
 * Wired to the real Web Push flow (notification.service.ts):
 * enable  -> permission -> register /notifications-sw.js ->
 *            pushManager.subscribe (VAPID) -> upsert push_subscriptions row
 * disable -> unsubscribe this device + delete its push_subscriptions row.
 * The old stub only flipped localStorage, so the pill said "Enabled"
 * while no subscription existed server-side and no push ever arrived.
 */
export function NotificationSettings() {
  const [permission, setPermission] = useState<string>("default");
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(getPushPermissionState());
    // Reflect the ACTUAL subscription state, not a stored flag.
    hasActivePushSubscription().then((active) => {
      setHasSubscription(active);
    });
  }, []);

  const isEnabled = permission === "granted" && hasSubscription;

  const handleEnablePush = useCallback(async () => {
    setIsRegistering(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      await enableDevicePush(supabase);
      setPermission(getPushPermissionState());
      setHasSubscription(true);
    } catch (err) {
      // "denied" by the user in the browser prompt is not an app failure,
      // but we still surface it clearly.
      setError(err instanceof Error ? err.message : "Failed to enable push notifications.");
      setPermission(getPushPermissionState());
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const handleDisablePush = useCallback(async () => {
    setIsRegistering(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      await disableDevicePush(supabase);
      setHasSubscription(false);
      setNotice("Push notifications turned off for this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable push notifications.");
    } finally {
      setIsRegistering(false);
    }
  }, []);

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Push notifications
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isEnabled ? "bg-campus-950 text-campus-400" : "bg-surface-200 text-slate-400"
              }`}
            >
              {isEnabled ? "Enabled" : "Disabled"}
            </span>
          </p>
          <p className="text-xs text-slate-400">Alerts for new messages, whispers, and orbit posts</p>
        </div>
        <Button
          onClick={isEnabled ? handleDisablePush : handleEnablePush}
          disabled={isRegistering}
          variant={isEnabled ? "secondary" : "default"}
          size="sm"
          className="shrink-0 min-h-[36px]"
        >
          {isRegistering ? "Working…" : isEnabled ? "Disable" : "Enable"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 border-t border-surface-200 pt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 border-t border-surface-200 pt-3 text-xs text-campus-300" role="status">
          {notice}
        </p>
      )}
      {permission === "denied" && !isEnabled && (
        <p className="mt-3 border-t border-surface-200 pt-3 text-xs text-amber-300">
          Notifications are blocked for this site in your browser settings. Unblock them
          (site settings &rarr; notifications) and try again.
        </p>
      )}
    </div>
  );
}
