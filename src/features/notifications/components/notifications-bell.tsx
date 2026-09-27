"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getUnreadNotificationCount } from "@/services/notifications/notification.service";

/**
 * Header bell with the unread count. notifications is NOT in the
 * supabase_realtime publication, so this polls (60s) and refreshes when
 * the tab becomes visible instead of using a realtime channel. It also
 * refreshes when the notifications page marks rows read, via the
 * "universe:notifications-changed" window event.
 */
export function NotificationsBell() {
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const count = await getUnreadNotificationCount(createClient());
        if (!cancelled) setUnread(count);
      } catch {
        // Non-fatal: the badge simply stays as-is.
      }
    };

    void refresh();

    const interval = window.setInterval(() => void refresh(), 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onNotificationsChanged = () => void refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("universe:notifications-changed", onNotificationsChanged);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("universe:notifications-changed", onNotificationsChanged);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={unread !== null && unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative flex h-8 w-8 items-center justify-center rounded-full border border-surface-300 bg-surface-200 text-sm text-foreground transition-colors hover:border-campus-500"
    >
      🔔
      {unread !== null && unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-campus-500 px-1 text-[9px] font-bold text-surface-50">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
