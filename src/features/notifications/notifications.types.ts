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
 * - notifications IS in the supabase_realtime publication (added Phase 9,
 *   sql/phase9-notification-welcome-survey.sql): realtime INSERT events
 *   drive the foreground toasts and the bell refresh via the
 *   "universe:notifications-changed" window event. The bell additionally
 *   polls (60s) and refreshes on tab visibility.
 * - 'announcement' rows are created server-side by the fan-out inside
 *   admin_publish_announcement (Phase 10,
 *   sql/phase10-announcement-notifications.sql) — never by the client.
 */

export type NotificationType =
  | "campus_message"
  | "message_request"
  | "orbit_post"
  | "orbit_mention"
  | "orbit_like"
  | "orbit_comment"
  | "announcement";

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
    case "announcement":
      return "/announcements";
    default:
      return "/orbit";
  }
}

/** Web Push VAPID public key (public by design). Rotated Oct 15 2026: the old
 *  legacy pair was lost, so a fresh keypair was deployed server-side. */
export const PUSH_VAPID_PUBLIC_KEY =
  "BJ9nOuTD2bb14RvAjrxV-CIS9VK4IX7V2iYcjYCuCIz0q__Mkcw4kNPpINZokZWHVFyINWtYd6G8Mlae9lUWhlI";

export const NOTIFICATIONS_PAGE_SIZE = 30;
