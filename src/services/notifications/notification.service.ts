import { SupabaseClient } from "@supabase/supabase-js";
import {
  NotificationActor,
  NotificationCursor,
  NotificationRow,
  NOTIFICATIONS_PAGE_SIZE,
  PUSH_VAPID_PUBLIC_KEY,
} from "@/features/notifications/notifications.types";

const NOTIFICATION_COLUMNS = "id, type, actor_id, title, body, link, is_read, created_at";

interface ListNotificationsResult {
  rows: NotificationRow[];
  nextCursor: NotificationCursor | null;
}

/** Lists the signed-in user's notifications (RLS: own rows only). */
export async function listNotifications(
  supabase: SupabaseClient,
  cursor?: NotificationCursor | null
): Promise<ListNotificationsResult> {
  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load notifications: ${error.message}`);
  }

  const rows = (data ?? []) as NotificationRow[];
  const last = rows.length === NOTIFICATIONS_PAGE_SIZE ? rows[rows.length - 1] : null;

  return {
    rows,
    nextCursor: last ? { created_at: last.created_at, id: last.id } : null,
  };
}

/** Unread notification count for the signed-in user (RLS scopes the rows). */
export async function getUnreadNotificationCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    throw new Error(`Unable to load notification count: ${error.message}`);
  }

  return count ?? 0;
}

/** Marks one notification read (RLS: own rows only). */
export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to mark notification read: ${error.message}`);
  }
}

/** Marks all the user's unread notifications read. */
export async function markAllNotificationsRead(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) {
    throw new Error(`Unable to mark notifications read: ${error.message}`);
  }
}

/** Fetches display profiles for notification actors (same pattern as Orbit). */
export async function fetchNotificationActors(
  supabase: SupabaseClient,
  actorIds: string[]
): Promise<Record<string, NotificationActor>> {
  const uniqueIds = [...new Set(actorIds.filter((id): id is string => Boolean(id)))].slice(0, 50);
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", uniqueIds);

  if (error) {
    // Non-fatal: notifications still render without actor details.
    return {};
  }

  const map: Record<string, NotificationActor> = {};
  for (const profile of (data ?? []) as NotificationActor[]) {
    map[profile.id] = profile;
  }
  return map;
}

function base64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  [...raw].forEach((char, index) => {
    view[index] = char.charCodeAt(0);
  });
  return view;
}

/**
 * The public key a subscription was created with, as base64. Chrome exposes
 * subscription.applicationServerKey as an ArrayBuffer of the raw 65-byte
 * key; some browsers omit it entirely.
 */
export function subscriptionServerKeyBase64(subscription: PushSubscription): string | null {
  try {
    const raw = (subscription as unknown as { applicationServerKey?: ArrayBuffer }).applicationServerKey;
    if (!raw || raw.byteLength === 0) return null;
    const bytes = new Uint8Array(raw);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return null;
  }
}

/**
 * True when an existing subscription was created with a VAPID key that no
 * longer matches the server's current key. Pushes signed with the new key
 * are rejected by the push service for such subscriptions, so they must be
 * re-created. Happened for real on Oct 15 2026 (phase 9 VAPID repair).
 */
export function subscriptionHasStaleServerKey(subscription: PushSubscription): boolean {
  const key = subscriptionServerKeyBase64(subscription);
  if (!key) return false; // unknown key: leave it alone; the sender cleans up
  return key !== PUSH_VAPID_PUBLIC_KEY;
}

export function getPushPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof window.Notification === "undefined") {
    return "unsupported";
  }
  return window.Notification.permission;
}

/** Persists a subscription for the signed-in user (endpoint is UNIQUE). */
export async function savePushSubscription(
  supabase: SupabaseClient,
  subscription: PushSubscription
): Promise<void> {
  const json = subscription.toJSON();
  const endpoint = String(subscription.endpoint || "");
  if (!endpoint) {
    throw new Error("The browser did not return a push endpoint.");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("session_expired");
  }

  const keys = (json.keys ?? {}) as { p256dh?: string; auth?: string };
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh ?? null,
      auth: keys.auth ?? null,
      subscription: json,
      user_agent: navigator.userAgent.slice(0, 500),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    throw new Error(`Unable to save the push subscription: ${error.message}`);
  }
}

/**
 * Registers this device for Web Push: permission -> register
 * /notifications-sw.js -> subscribe with the VAPID key -> persist.
 * Existing subscriptions are reused ONLY when they were created with the
 * current VAPID key; stale-key subscriptions are replaced.
 */
export async function enableDevicePush(supabase: SupabaseClient): Promise<void> {
  if (typeof window.Notification === "undefined") {
    throw new Error("This browser does not support device notifications.");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported by this browser.");
  }
  // No pre-check on Notification.permission here: the synchronous read can be
  // stale in some browsers/embedded webviews. requestPermission() below is the
  // authoritative source and handles the denied case itself.
  const permission = await window.Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications were blocked."
        : "Notification permission was not granted."
    );
  }

  const registration = await navigator.serviceWorker.register("/notifications-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (subscription && subscriptionHasStaleServerKey(subscription)) {
    // Signed with a retired VAPID key: pushes are silently dropped by the
    // push service. Drop it so the subscribe below creates a fresh one.
    await subscription.unsubscribe().catch(() => undefined);
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(PUSH_VAPID_PUBLIC_KEY),
    });
  }

  await savePushSubscription(supabase, subscription);
}

/**
 * Silent re-registration for devices that already granted permission but
 * hold a stale-key subscription (VAPID rotation, Oct 15 2026). Runs without
 * any prompt: permission was already granted, only the subscription is
 * refreshed. Returns "renewed" when a subscription was replaced.
 */
export async function renewStalePushSubscription(
  supabase: SupabaseClient
): Promise<"renewed" | "ok" | "skipped"> {
  if (typeof window === "undefined") return "skipped";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "skipped";
  if (getPushPermissionState() !== "granted") return "skipped";
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return "skipped";
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return "skipped";
    if (!subscriptionHasStaleServerKey(subscription)) return "ok";

    await subscription.unsubscribe().catch(() => undefined);
    const fresh = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(PUSH_VAPID_PUBLIC_KEY),
    });
    await savePushSubscription(supabase, fresh);
    return "renewed";
  } catch {
    return "skipped";
  }
}

/** Unsubscribes this device's push subscription and removes its row. */
export async function disableDevicePush(supabase: SupabaseClient): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    const endpoint = String(subscription.endpoint || "");
    await subscription.unsubscribe().catch(() => undefined);
    if (endpoint) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
  }
}

/** Whether this device currently holds an active push subscription. */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

/** Unread count for announcement notifications only (Orbit badge).
 *  Reuses the same notifications read-state model — RLS scopes the query
 *  to the signed-in user's own rows; there is no separate announcement
 *  counter. */
export async function getUnreadAnnouncementNotificationCount(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .eq("type", "announcement");

  if (error) {
    throw new Error(`Unable to load announcement count: ${error.message}`);
  }

  return count ?? 0;
}

/** Marks the user's unread announcement notifications read (RLS: own rows
 *  only) — called when the Orbit announcements panel is opened. Same
 *  read-state model the notifications page uses. */
export async function markAnnouncementNotificationsRead(
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("type", "announcement")
    .eq("is_read", false);

  if (error) {
    throw new Error(`Unable to mark announcement notifications read: ${error.message}`);
  }
}
