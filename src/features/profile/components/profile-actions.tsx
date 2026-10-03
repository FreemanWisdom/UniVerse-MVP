"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { sendRequest, respondRequest } from "@/services/chat/requests.service";

export type ProfileRelation = "none" | "pending_outgoing" | "pending_incoming" | "friends";

interface ProfileActionsProps {
  profileId: string;
  profileName: string;
  relation: ProfileRelation;
  /** Request id — required when relation is pending_incoming. */
  requestId?: string;
  /** Conversation id — required when relation is friends. */
  conversationId?: string;
}

/**
 * Connection actions on a fellow student's profile.
 *
 * - none: send a campus chat request (message optional, sensible default).
 * - pending_outgoing: request already sent — show the pending state.
 * - pending_incoming: accept or decline the request right from the profile.
 * - friends: link straight into the existing conversation.
 *
 * All state transitions use the existing chat RPCs (campus_chat_send_request /
 * campus_chat_respond_request); nothing here touches the database directly.
 */
export function ProfileActions({
  profileId,
  profileName,
  relation: initialRelation,
  requestId,
  conversationId: initialConversationId,
}: ProfileActionsProps) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [relation, setRelation] = useState<ProfileRelation>(initialRelation);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const firstName = profileName.split(/\s+/)[0] || profileName;

  const handleSend = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendRequest(
        supabase,
        profileId,
        message.trim() || `Hi ${firstName}! I'd like to connect with you on Campus.`
      );
      setRelation("pending_outgoing");
      setJustSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  };

  const handleRespond = async (action: "accept" | "decline") => {
    if (!requestId) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "accept") {
        const newConvId = await respondRequest(supabase, requestId, "accept");
        setConversationId(newConvId);
        setRelation("friends");
      } else {
        await respondRequest(supabase, requestId, "decline");
        setRelation("none");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
      {relation === "friends" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">You&apos;re friends</p>
            <p className="mt-0.5 text-xs text-slate-500">
              You already have an open conversation with {firstName}.
            </p>
          </div>
          {conversationId ? (
            <Link
              href={`/chat?c=${conversationId}`}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-campus-500 px-3 text-xs font-medium text-black shadow-[0_0_0_1px_rgba(34,197,94,0.2),0_4px_16px_-4px_rgba(34,197,94,0.35)] transition-colors hover:bg-campus-400"
            >
              Message
            </Link>
          ) : (
            <Button size="sm" disabled>
              Message
            </Button>
          )}
        </div>
      ) : relation === "pending_outgoing" ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Chat request pending</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {justSent
                ? "Request sent — you'll see a notification when they respond."
                : `${firstName} hasn't responded to your request yet.`}
            </p>
          </div>
        </div>
      ) : relation === "pending_incoming" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{firstName} wants to connect</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Accept to start chatting, or decline the request.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleRespond("accept")} disabled={busy}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleRespond("decline")} disabled={busy}>
              Decline
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-foreground">Connect with {firstName}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Send a chat request — you can talk once they accept.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder={`Say hi to ${firstName} (optional)`}
            aria-label={`Message to ${profileName} with your chat request`}
            className="mt-3 w-full resize-none rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-campus-500"
          />
          <Button className="mt-2" size="sm" onClick={handleSend} disabled={busy}>
            {busy ? "Sending…" : "Send chat request"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
