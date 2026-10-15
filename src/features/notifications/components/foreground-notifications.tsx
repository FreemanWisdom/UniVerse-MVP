"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LiveNotification {
  id: string;
  title: string;
  body: string;
  link: string | null;
}

const TOAST_MS = 6000;

/**
 * Foreground notification alerts. While the app is open and visible, new
 * notification rows (created server-side by the DB triggers, RLS-scoped to
 * the signed-in user) pop a toast; the header bell refreshes immediately.
 *
 * Suppression rules:
 *  - hidden tab: background push (the service worker) already covers it;
 *  - user is already on the notification's target page (e.g. viewing the
 *    conversation the message belongs to): the message is visible in-app,
 *    a toast would be a duplicate interruption.
 *
 * Realtime payloads are untrusted: only the id is read from the event, the
 * row itself is re-fetched through RLS.
 */
export function ForegroundNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<LiveNotification | null>(null);
  const hideTimer = useRef<number | null>(null);
  const currentUrl = useRef<string>("");

  useEffect(() => {
    currentUrl.current = pathname + (searchParams?.toString() ? "?" + searchParams.toString() : "");
  }, [pathname, searchParams]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-foreground:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const untrustedId = payload.new?.id;
          if (!untrustedId) return;

          const { data, error } = await supabase
            .from("notifications")
            .select("id, title, body, link, is_read")
            .eq("id", untrustedId)
            .single();
          if (error || !data) return; // RLS reject or row deleted: drop silently.

          // Bell + unread count refresh (NotificationsBell listens for this).
          window.dispatchEvent(new Event("universe:notifications-changed"));

          if (document.visibilityState !== "visible") return;

          const link = (data.link || "/orbit").trim();
          // Absolute URLs only make sense same-origin; normalize to path.
          const linkPath = link.startsWith("http")
            ? new URL(link).pathname + new URL(link).search
            : link;
          // Suppress when the user is already looking at the destination.
          if (currentUrl.current === linkPath) return;

          if (hideTimer.current) window.clearTimeout(hideTimer.current);
          setToast({ id: data.id, title: data.title, body: data.body, link });
          hideTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
        }
      )
      .subscribe();

    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      void supabase.removeChannel(channel);
    };
  }, []);

  const openToast = () => {
    if (!toast) return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setToast(null);
    router.push(toast.link || "/orbit");
  };

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-4"
    >
      <button
        type="button"
        onClick={openToast}
        className="w-full rounded-lg border border-surface-300 bg-surface-100 p-4 text-left shadow-lg transition-colors hover:border-campus-500"
      >
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        {toast.body ? (
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{toast.body}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-campus-300">Tap to open</p>
      </button>
    </div>
  );
}
