"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserLink } from "@/components/user/user-link";
import { IconFlag } from "@/components/icons";
import type { ConversationWithDetails } from "@/services/chat/conversations.service";
import { initials } from "@/features/orbit/orbit.utils";

/** Lightweight recipient picker for sharing an Orbit post.
 * Only conversations that already exist (accepted message requests) are
 * listed — RLS on `conversations` guarantees the user is a member — so no
 * unauthorized user-to-user sharing is possible from here. */
export function OrbitShareDialog({
  post,
  onClose,
  onShared,
}: {
  post: { id: string; content: string | null; images: string[] | null };
  onClose: () => void;
  onShared: (recipientName: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationWithDetails[] | null>(null);
  const [error, setError] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Fetch conversations once, when the dialog mounts.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { listConversations } = await import("@/services/chat/conversations.service");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("Not authenticated");
        const conversations = await listConversations(supabase, session.user.id);
        if (!cancelled) setConversations(conversations);
      } catch {
        if (!cancelled) {
          setError("We couldn't load your conversations.");
          setConversations([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = (conversations ?? []).filter((conversation) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return (conversation.other_member.profile.full_name ?? "").toLowerCase().includes(normalized);
  });

  async function share(conversation: ConversationWithDetails) {
    if (sendingTo) return;
    setSendingTo(conversation.id);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const { shareOrbitPost } = await import("@/services/orbit");
      const supabase = createClient();
      await shareOrbitPost(supabase, post.id, post, conversation.id, conversation.other_member.user_id);
      onShared(conversation.other_member.profile.full_name ?? "your friend");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send that message.");
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share this post in chat"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/90 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-xl border border-white/10 bg-surface-100 p-4 sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Send to</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="rounded px-2 py-1 text-slate-400 hover:bg-white/5"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Shares go through your existing chats. Only accepted conversations are listed.
        </p>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your chats…"
          aria-label="Search conversations to share with"
          className="mt-3 w-full rounded-md border border-white/10 bg-surface-200/30 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-campus-500"
        />

        {error ? (
          <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>
        ) : null}

        <div className="mt-3 max-h-64 overflow-y-auto">
          {conversations === null ? (
            <p className="py-4 text-center text-xs text-slate-500" role="status">Loading chats…</p>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              No chats yet. Accepted message requests appear here.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((conversation) => {
                const name = conversation.other_member.profile.full_name ?? "Student";
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => void share(conversation)}
                      disabled={sendingTo !== null}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 disabled:opacity-60"
                      aria-label={`Share post with ${name}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-xs font-semibold text-slate-300">
                        {conversation.other_member.profile.avatar_url ? (
                          <img src={conversation.other_member.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(name)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {conversation.other_member.profile.department} · {conversation.other_member.profile.level}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-campus-400">
                        {sendingTo === conversation.id ? "Sending…" : "Send"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
