/**
 * Contracts for notifications, LIVE-VERIFIED Sept 2026:
 * - notifications table: id, user_id, type, actor_id, title, body, link,
 *   is_read (default false), created_at. RLS: read own rows only; UPDATE
 *   limited to marking own rows read. No user INSERT/DELETE — notifications
 *   are created server-side by triggers (universeicos_notify_message,
 *   universeicos_notify_message_request, orbit_notify_event/mention).
 * - The `link` column contains LEGACY routes (/dashboard.html) — never
 *   navigate by it in this app; map by `type` instead.
 * - push_subscriptions: user_id, endpoint (UNIQUE — upsert-safe),
 *   p256dh, auth, subscription (jsonb), user_agent. RLS: users manage
 *   their own rows.
 * - send-push Edge Function is server-only (called by a DB trigger with a
 *   vault secret); the client never calls it. Web Push subscription on the
 *   client needs the VAPID public key, hardcoded in the legacy client too
 *   (it is public by design).
 * - notifications is NOT in the supabase_realtime publication, so there is
 *   no realtime stream for it; the UI polls instead. Adding the table to
 *   the publication would be a DB change requiring owner approval.
 */

export type NotificationType =
  | "campus_message"
  | "message_request"
  | "orbit_post"
  | "orbit_mention"
  | "orbit_like"
  | "orbit_comment";

export interface NotificationRow {
  id: string;
  type: string;
  actor_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationActor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface NotificationCursor {
  created_at: string;
  id: string;
}

/** Maps a notification to an in-app route. The stored `link` is legacy. */
export function notificationRoute(type: string): string {
  switch (type) {
    case "campus_message":
    case "message_request":
      return "/chat";
    default:
      return "/orbit";
  }
}

/** Web Push VAPID public key (public by design; mirrors the legacy client). */
export const PUSH_VAPID_PUBLIC_KEY =
  "BIgx8xy_gacjbLZ8uz-4pktk-fhJWUQQFcDD9MtddNhM9ur2_31OIa3NeZUXeD3payMiLtKGAeOyb8ejZhVsiT4";

export const NOTIFICATIONS_PAGE_SIZE = 30;
