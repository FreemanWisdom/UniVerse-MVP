"use client";

import { useEffect, useState } from "react";
import { IconMegaphone } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import {
  fetchActiveAnnouncements,
  StudentAnnouncement,
} from "@/services/announcements/student.service";
import {
  getUnreadAnnouncementNotificationCount,
  markAnnouncementNotificationsRead,
} from "@/services/notifications/notification.service";

/**
 * Announcements entry point inside Orbit (Phase 10: the announcement
 * nav item moved here). A megaphone button sits immediately above the
 * post composer; clicking it expands an inline panel with the same
 * announcements data the /announcements page serves
 * (get_active_announcements RPC — campus scope computed server-side,
 * publisher never exposed).
 *
 * Unread badge: reuses the existing notification read-state model — it
 * counts the signed-in user's UNREAD rows in notifications with
 * type='announcement' (RLS scopes the query to own rows; the count is
 * created server-side by admin_publish_announcement's fan-out). Opening
 * the panel marks those rows read via the same RLS-bounded UPDATE every
 * other read action uses, so the header bell count stays consistent —
 * no separate announcement counter exists.
 *
 * Live updates: the badge refreshes on the same
 * "universe:notifications-changed" window event the bell listens to
 * (ForegroundNotifications dispatches it on every realtime INSERT).
 */
export function OrbitAnnouncements() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StudentAnnouncement[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshUnread = async () => {
      try {
        const count = await getUnreadAnnouncementNotificationCount(createClient());
        if (!cancelled) setUnread(count);
      } catch {
        // Non-fatal: the badge simply stays as-is.
      }
    };

    void refreshUnread();
    // ForegroundNotifications dispatches this on realtime INSERTs; the
    // notifications page dispatches it after marking rows read.
    const onChanged = () => void refreshUnread();
    window.addEventListener("universe:notifications-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("universe:notifications-changed", onChanged);
    };
  }, []);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const announcements = await fetchActiveAnnouncements(createClient());
      setRows(announcements);
      // Reading the panel clears the announcement badge: same
      // read-state model, same RLS-bounded update the notifications
      // page performs. Bell refreshes via the shared window event.
      await markAnnouncementNotificationsRead(createClient());
      window.dispatchEvent(new Event("universe:notifications-changed"));
      setUnread(0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-surface-100/40 px-3 py-2 text-sm text-foreground transition-colors hover:border-campus-500"
      >
        <span className="flex items-center gap-2">
          <IconMegaphone size={16} className="text-campus-400" />
          <span className="font-medium">Announcements</span>
        </span>
        <span className="flex items-center gap-2">
          {unread !== null && unread > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-campus-500 px-1.5 text-[10px] font-bold text-surface-50">
              {unread > 99 ? "99+" : unread} new
            </span>
          ) : null}
          <span className="text-xs text-slate-400">{open ? "Hide" : "View"}</span>
        </span>
      </button>

      {open ? (
        loading ? (
          <p className="px-1 text-sm text-slate-400" aria-live="polite">
            Loading announcements…
          </p>
        ) : error ? (
          <p className="px-1 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : !rows || rows.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-400">
              No announcements right now — campus-wide updates from the UniVerse team will appear
              here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2" aria-live="polite">
            {rows.map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    {a.scope === "global" || a.scope === "platform" ? (
                      <Badge variant="secondary">For everyone</Badge>
                    ) : (
                      <Badge variant="default">For your campus</Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-xs text-slate-300">{a.body}</p>
                  <p className="text-[11px] text-slate-500">
                    {a.display_name || "UniVerse Team"} · {formatOrbitTime(a.published_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
