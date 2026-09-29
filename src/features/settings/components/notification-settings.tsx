"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          Push Notifications
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${isEnabled ? 'bg-campus-900 text-campus-400' : 'bg-surface-200 text-slate-400'}`}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </CardTitle>
        <CardDescription>Get alerts for new messages, whispers, and orbit posts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300">
          Push notifications are delivered securely to this device.
        </p>

        {error && (
          <div className="text-sm text-red-400 p-2 bg-red-950/50 rounded border border-red-800" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="text-sm text-campus-300 p-2 rounded border border-campus-800 bg-campus-900/30" role="status">
            {notice}
          </div>
        )}
        {permission === "denied" && !isEnabled && (
          <div className="text-sm text-amber-300 p-2 bg-amber-950/40 rounded border border-amber-800">
            Notifications are blocked for this site in your browser settings. Unblock them
            (site settings &rarr; notifications) and try again.
          </div>
        )}

        {isEnabled ? (
          <Button onClick={handleDisablePush} disabled={isRegistering} variant="secondary">
            {isRegistering ? "Turning off..." : "Disable on this device"}
          </Button>
        ) : (
          <Button onClick={handleEnablePush} disabled={isRegistering} variant="default">
            {isRegistering ? "Enabling..." : "Enable Push Notifications"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
