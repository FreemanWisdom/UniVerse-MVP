"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  getPushPermissionState,
  enableDevicePush,
  disableDevicePush,
  hasActivePushSubscription,
  sendTestPushNotification,
  fetchPushReceipts,
  PushReceipt,
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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
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

/** One-tap end-to-end diagnostics: sends a real test notification through
 *  the exact production path (notification row -> trigger -> send-push ->
 *  web push), then reports per-device delivery from the receipt log. */
  const handleTestPush = useCallback(async () => {
    setIsTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const supabase = createClient();
      const notificationId = await sendTestPushNotification(supabase);
      setTestResult("Sending… watching for delivery receipts…");
      // The trigger + edge fn usually settle within a few seconds.
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        let receipts: PushReceipt[] = [];
        try {
          receipts = await fetchPushReceipts(supabase, notificationId);
        } catch {
          // receipt read failure is not fatal for the test itself
        }
        if (receipts.length > 0) {
          const sent = receipts.filter((r) => r.status === "sent").length;
          const stale = receipts.filter((r) => r.status === "stale_removed").length;
          const failed = receipts.length - sent - stale;
          if (sent > 0) {
            setTestResult(`Delivered to ${sent} device${sent > 1 ? "s" : ""} of ${receipts.length}. Check your phone!`);
          } else if (stale > 0) {
            setTestResult(
              `${stale} of your registered device${stale > 1 ? "s" : ""} had an expired push subscription (now removed). Tap Disable, then Enable to re-register, and test again.`
            );
          } else {
            setTestResult(`The push service could not deliver right now (${failed} device${failed === 1 ? "" : "s"} failed with a temporary error — this can happen when a phone has been offline). The test notification is saved in your feed.`);
          }
          return;
        }
      }
      setTestResult("No delivery receipts yet. If no device is registered for push (or the send-push worker is unreachable), nothing is sent — the test notification is still saved in your feed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send the test notification.");
    } finally {
      setIsTesting(false);
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
      <div className="mt-3 border-t border-surface-200 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleTestPush}
            disabled={isTesting}
            variant="outline"
            size="sm"
            className="min-h-[36px]"
          >
            {isTesting ? "Testing…" : "Send test notification"}
          </Button>
          <span className="text-[11px] text-slate-500">
            Runs the full delivery path and reports the result.
          </span>
        </div>
        {testResult && (
          <p className="mt-2 text-xs text-campus-300" role="status" aria-live="polite">
            {testResult}
          </p>
        )}
      </div>

      {permission === "denied" && !isEnabled && (
        <p className="mt-3 border-t border-surface-200 pt-3 text-xs text-amber-300">
          Notifications are blocked for this site in your browser settings. Unblock them
          (site settings &rarr; notifications) and try again.
        </p>
      )}
    </div>
  );
}
