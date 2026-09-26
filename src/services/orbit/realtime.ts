import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { OrbitRealtimeEvent } from "@/features/orbit/orbit.types";

export function subscribeToOrbit(supabase: SupabaseClient, onEvent: (event: OrbitRealtimeEvent) => void): { channel: RealtimeChannel; unsubscribe: () => Promise<void> } {
  const channel = supabase.channel(`orbit:${crypto.randomUUID()}`);
  (['orbit_feed', 'orbit_post_likes', 'orbit_comments', 'orbit_post_saves'] as const).forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
      onEvent({ table, eventType: payload.eventType as OrbitRealtimeEvent["eventType"], new: payload.new as Record<string, unknown>, old: payload.old as Record<string, unknown> });
    });
  });
  channel.subscribe();
  return { channel, unsubscribe: () => supabase.removeChannel(channel).then(() => undefined) };
}
