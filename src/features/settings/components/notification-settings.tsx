"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NotificationSettings() {
  const [permission, setPermission] = useState<string>("default");
  const [localState, setLocalState] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only access browser APIs after mount
    if (typeof window !== "undefined" && "Notification" in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission(Notification.permission);
      setLocalState(localStorage.getItem('universeicos_device_notifications'));
    }
  }, []);

  const handleEnablePush = async () => {
    setIsRegistering(true);
    setError(null);
    try {
      // In a real PWA context, this calls the logic in send-push.ts / notifications-sw.js
      // We will emulate the local storage state to match legacy code's behavior:

      if (!("Notification" in window)) {
        throw new Error("Push notifications are not supported by this browser.");
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        // Assume universeICOSRegisterPush() would happen here in full implementation
        localStorage.setItem('universeicos_device_notifications', 'enabled');
        setLocalState('enabled');
      } else {
        throw new Error("Notifications were blocked. Please enable them in your browser settings.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable notifications");
    } finally {
      setIsRegistering(false);
    }
  };

  const isEnabled = permission === "granted" && localState === "enabled";

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
          <div className="text-sm text-red-400 p-2 bg-red-950/50 rounded border border-red-800">
            {error}
          </div>
        )}

        {!isEnabled && (
          <Button
            onClick={handleEnablePush}
            disabled={isRegistering}
            variant="default"
          >
            {isRegistering ? "Enabling..." : "Enable Push Notifications"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
