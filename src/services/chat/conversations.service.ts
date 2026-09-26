import { SupabaseClient } from "@supabase/supabase-js";
import { Conversation, ConversationMember, Message } from "@/features/chat/chat.types";

export interface ConversationWithDetails extends Conversation {
  other_member: {
    user_id: string;
    profile: {
      id: string;
      full_name: string;
      avatar_url: string;
      department: string;
      university: string;
      level: string;
    };
  };
  my_membership: ConversationMember;
  last_message: Message | null;
}

export async function listConversations(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<ConversationWithDetails[]> {
  // RLS naturally restricts to conversations the current user is a member of.
  // We fetch all members for these conversations, and the latest message.
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id, created_at, created_by, is_group, school_tag, title,
      members:conversation_members (
        conversation_id, joined_at, last_read_at, user_id,
        profile:profiles (
          id, full_name, avatar_url, department, university, level
        )
      ),
      messages (
        id, conversation_id, sender_id, content, created_at, moderation_status
      )
    `)
    .order("created_at", { ascending: false, foreignTable: "messages" })
    .limit(1, { foreignTable: "messages" });

  if (error) {
    throw new Error(error.message || "Failed to list conversations.");
  }

  // Transform to separate my_membership and other_member
  return (data || []).map((conv: any) => {
    const myMem = conv.members.find((m: any) => m.user_id === currentUserId);
    const otherMem = conv.members.find((m: any) => m.user_id !== currentUserId);

    // Fallback if other member is missing (e.g. they left or single-user chat)
    const safeOtherMem = otherMem || myMem;

    return {
      id: conv.id,
      created_at: conv.created_at,
      created_by: conv.created_by,
      is_group: conv.is_group,
      school_tag: conv.school_tag,
      title: conv.title,
      my_membership: myMem,
      other_member: {
        user_id: safeOtherMem.user_id,
        profile: safeOtherMem.profile,
      },
      last_message: (conv.messages && conv.messages.length > 0) ? conv.messages[0] : null,
    };
  });
}

export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  currentUserId: string
) {
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId);

  if (error) {
    throw new Error(error.message || "Failed to mark as read.");
  }
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 50,
  beforeCursor?: { created_at: string; id: string }
): Promise<Message[]> {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (beforeCursor) {
    query = query.or(`created_at.lt.${beforeCursor.created_at},and(created_at.eq.${beforeCursor.created_at},id.lt.${beforeCursor.id})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Failed to load messages.");
  }
  
  // Return in chronological order (ascending) for UI rendering
  return (data as Message[]).reverse();
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  content: string
): Promise<Message> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      content,
      sender_id: session.user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to send message.");
  }

  return data as Message;
}
