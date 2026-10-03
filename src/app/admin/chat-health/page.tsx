"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AdminAlert,
  AdminCard,
  AdminCardHeader,
  AdminLoadingRows,
  AdminPageHeader,
} from "@/components/admin/ui";

/**
 * Chat Health — aggregate/system information only.
 *
 * Boundary (enforced by architecture, not just this page):
 * - There is no admin UI anywhere for reading private messages.
 * - No message plaintext, search, export, or decryption exists in the admin console.
 *
 * IMPORTANT internal fact: Universe Chat is NOT currently end-to-end encrypted.
 * Messages are stored server-side today. This page must not display any "E2EE"
 * claim; genuine client-side E2EE is a separate planned security project.
 */
export default function AdminChatHealthPage() {
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const { data, rpcError } = await createClient()
          .rpc("admin_action", { p_action: "inspect_chat_messages" })
          .then((result) => ({ data: result.data as { count?: number } | null, rpcError: result.error }));
        if (rpcError) throw new Error(rpcError.message);
        setMessageCount(data?.count ?? 0);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load chat statistics.");
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Chat Health"
        description="Aggregate chat system information only — private conversations are never readable here."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {messageCount === null && !error ? (
        <AdminLoadingRows rows={2} />
      ) : (
        <>
          <AdminCard>
            <AdminCardHeader title="Chat system" description="Real counts from the live database." />
            <div className="flex flex-wrap gap-x-8 gap-y-3 p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Messages stored</p>
                <p className="mt-0.5 text-2xl font-semibold text-slate-900">{messageCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Active conversations</p>
                <p className="mt-0.5 text-2xl font-semibold text-slate-400">not tracked</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Requires a dedicated aggregate RPC (planned, not yet approved)
                </p>
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader title="Administration boundary" description="What administrators can and cannot do." />
            <div className="space-y-3 p-5 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Can:</span> view aggregate counts and
                system-level chat health only.
              </p>
              <p>
                <span className="font-medium text-slate-900">Cannot:</span> read private messages,
                search message text, export conversations, or decrypt anything. No such interface
                exists in the admin console.
              </p>
              <AdminAlert tone="warning">
                Universe Chat is not end-to-end encrypted yet. Message content is stored
                server-side today; a genuine client-side E2EE rebuild is a separate planned security
                project. This page intentionally makes no encryption claims.
              </AdminAlert>
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}
