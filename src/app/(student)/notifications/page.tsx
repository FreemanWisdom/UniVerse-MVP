"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserLink } from "@/components/user/user-link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { displayName, formatOrbitTime, initials } from "@/features/orbit/orbit.utils";
import {
  NotificationActor,
  NotificationCursor,
  NotificationRow,
  notificationRoute,
} from "@/features/notifications/notifications.types";
import {
  disableDevicePush,
  enableDevicePush,
  fetchNotificationActors,
  getPushPermissionState,
  hasActivePushSubscription,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications/notification.service";

type PushState = "unsupported" | "granted" | "denied" | "default";

export default function NotificationsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [actors, setActors] = useState<Record<string, NotificationActor>>({});
  const [cursor, setCursor] = useState<NotificationCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [pushPermission, setPushPermission] = useState<PushState>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const unreadCount = rows.filter((row) => !row.is_read).length;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      setLoading(true);
      setError(null);

      try {
        const { rows: initialRows, nextCursor } = await listNotifications(supabase);
        const actorMap = await fetchNotificationActors(
          supabase,
          initialRows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))
        );
        if (!cancelled) {
          setRows(initialRows);
          setCursor(nextCursor);
          setActors(actorMap);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Deferred so the synchronous setState lint rule stays satisfied.
    queueMicrotask(() => setPushPermission(getPushPermissionState()));
    void hasActivePushSubscription().then(setPushSubscribed);
  }, []);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const supabase = createClient();
    setLoadingMore(true);
    setError(null);

    try {
      const { rows: moreRows, nextCursor } = await listNotifications(supabase, cursor);
      const newActors = await fetchNotificationActors(
        supabase,
        moreRows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))
      );
      setRows((current) => {
        const seen = new Set(current.map((row) => row.id));
        return [...current, ...moreRows.filter((row) => !seen.has(row.id))];
      });
      setActors((current) => ({ ...current, ...newActors }));
      setCursor(nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load more notifications.");
    } finally {
      setLoadingMore(false);
    }
  };

  const open = async (row: NotificationRow) => {
    const supabase = createClient();

    if (!row.is_read) {
      setBusyId(row.id);
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, is_read: true } : item))
      );
      try {
        await markNotificationRead(supabase, row.id);
        window.dispatchEvent(new Event("universe:notifications-changed"));
      } catch {
        setRows((current) =>
          current.map((item) => (item.id === row.id ? { ...item, is_read: false } : item))
        );
      } finally {
        setBusyId(null);
      }
    }

    // Navigate by type; the stored `link` is a legacy route.
    router.push(notificationRoute(row.type));
  };

  const markAll = async () => {
    const supabase = createClient();
    setMarkingAll(true);

    try {
      await markAllNotificationsRead(supabase);
      setRows((current) => current.map((row) => ({ ...row, is_read: true })));
      window.dispatchEvent(new Event("universe:notifications-changed"));
    } catch {
      setError("We couldn't mark your notifications as read. Please try again.");
    } finally {
      setMarkingAll(false);
    }
  };

  const enablePush = async () => {
    const supabase = createClient();
    setPushBusy(true);
    setPushMessage(null);

    try {
      await enableDevicePush(supabase);
      setPushPermission(getPushPermissionState());
      setPushSubscribed(true);
      setPushMessage("Device notifications are enabled.");
    } catch (pushError) {
      setPushMessage(
        pushError instanceof Error && pushError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : pushError instanceof Error
            ? pushError.message
            : "We couldn't enable device notifications."
      );
      setPushPermission(getPushPermissionState());
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    const supabase = createClient();
    setPushBusy(true);
    setPushMessage(null);

    try {
      await disableDevicePush(supabase);
      setPushSubscribed(false);
      setPushMessage("Device notifications are disabled on this device.");
    } catch {
      setPushMessage("We couldn't disable device notifications. Please try again.");
    } finally {
      setPushBusy(false);
    }
  };

  const pushSection = () => {
    if (pushPermission === "unsupported") {
      return <p className="text-sm text-slate-400">This browser doesn&#39;t support device notifications.</p>;
    }
    if (pushPermission === "denied") {
      return (
        <p className="text-sm text-slate-400">
          Notifications are blocked for this site in your browser settings. Allow them, then return here.
        </p>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        {pushSubscribed ? (
          <>
            <span className="text-sm text-campus-400">Enabled on this device</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void disablePush()} disabled={pushBusy}>
              {pushBusy ? "Working…" : "Disable"}
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" onClick={() => void enablePush()} disabled={pushBusy}>
            {pushBusy ? "Setting up…" : "Enable device notifications"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : "Campus alerts and personal activity."}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void markAll()} disabled={markingAll}>
            {markingAll ? "Marking…" : "Mark all read"}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Device notifications</p>
          {pushSection()}
          {pushMessage ? <p className="text-sm text-slate-400" role="status">{pushMessage}</p> : null}
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-400" aria-live="polite">Loading notifications…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">
            No notifications yet — campus activity will appear here as it happens.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" aria-live="polite">
          {rows.map((row) => {
            const actor = row.actor_id ? actors[row.actor_id] : undefined;
            const name = actor ? displayName(actor) : "Campus";
            return (
              <div
                key={row.id}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:border-campus-500 ${
                  row.is_read ? "border-surface-200 bg-surface-50" : "border-campus-500/40 bg-campus-500/5"
                }`}
              >
                {/* Avatar opens the actor's profile; system notifications keep a plain avatar */}
                <UserAvatar
                  profile={{ id: actor?.id, full_name: name, avatar_url: actor?.avatar_url }}
                  size="md"
                />
                <button
                  type="button"
                  onClick={() => void open(row)}
                  disabled={busyId === row.id}
                  aria-label={`Open notification: ${row.title}`}
                  className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`block text-sm ${row.is_read ? "font-medium text-slate-300" : "font-semibold text-foreground"}`}>
                      {row.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-500">{formatOrbitTime(row.created_at)}</span>
                  </span>
                  {row.body ? (
                    <span className="mt-1 block break-words text-xs text-slate-400">{row.body}</span>
                  ) : null}
                  <span className="mt-2 block text-[11px] text-slate-500">
                    {actor ? (
                      <UserLink mode="action" userId={actor.id} name={name} className="text-[11px] text-slate-500" />
                    ) : (
                      name
                    )}{" "}
                    · {row.type.replace(/_/g, " ")}
                  </span>
                </button>
                {!row.is_read ? (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-campus-500" aria-label="Unread" />
                ) : null}
              </div>
            );
          })}

          {cursor ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
