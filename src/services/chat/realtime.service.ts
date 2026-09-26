import { SupabaseClient } from "@supabase/supabase-js";
import { Message } from "@/features/chat/chat.types";

export type MessageRealtimeCallback = (message: Message) => void;

/**
 * Subscribes to new messages and fetches the secure row data through RLS
 * before invoking the callback. This ensures we never trust raw event payloads.
 */
export function subscribeToMessages(
  supabase: SupabaseClient,
  onMessage: MessageRealtimeCallback
) {
  // We listen to all public.messages INSERTs.
  // The actual event filtering is handled safely below.
  const channel = supabase
    .channel("public:messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        // payload.new contains the raw untrusted row
        const untrustedId = payload.new?.id;
        if (!untrustedId) return;

        // Fetch the safe row via RLS
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("id", untrustedId)
          .single();

        if (error || !data) {
          // If RLS rejects the read (e.g., they aren't in this conversation),
          // or if the message was immediately deleted, drop it silently.
          return;
        }

        // Pass the safe, verified row to the handler
        onMessage(data as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
