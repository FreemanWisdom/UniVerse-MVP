"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Campus presence via Supabase Realtime Presence.
 *
 * Design notes (audited before implementation — no prior presence
 * infrastructure existed; profiles is NOT in the supabase_realtime
 * publication and nothing in the legacy/new UI tracked presence):
 *
 * - One Realtime presence channel per campus: `presence:campus:<university>`.
 *   Presence is only ever visible to same-campus peers, matching the
 *   product's campus-scoped social model and leaking nothing across campuses.
 * - The channel key is the user's id (`presence_key`), and the tracked
 *   payload is empty — presence carries identity only, never profile data.
 * - Ephemeral by design: nothing is written to the database. When a client
 *   disconnects (tab close, network drop) Realtime drops it from the state
 *   automatically. There are no timers, no heartbeats, no fake "last seen".
 */

interface PresenceContextValue {
  /** True once the presence channel is subscribed and synced. */
  ready: boolean;
  /** User ids currently online on the caller's campus. */
  onlineIds: ReadonlySet<string>;
  /** Whether a specific user is currently online (offline until synced). */
  isOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextValue>({
  ready: false,
  onlineIds: new Set<string>(),
  isOnline: () => false,
});

export function usePresence() {
  return useContext(PresenceContext);
}

interface PresenceProviderProps {
  userId: string;
  university: string;
  children: React.ReactNode;
}

export function PresenceProvider({ userId, university, children }: PresenceProviderProps) {
  const [ready, setReady] = useState(false);
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    // No campus context or session — stay offline-capable but do nothing.
    if (!userId || !university) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence:campus:${university}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Minimal payload: identity comes from presence_key.
          void channel.track({ online: true });
          setReady(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setReady(false);
        }
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [userId, university]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      ready,
      onlineIds,
      isOnline: (id: string) => onlineIds.has(id),
    }),
    [ready, onlineIds]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
