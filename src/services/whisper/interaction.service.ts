import { SupabaseClient } from "@supabase/supabase-js";
import { WhisperPostPublic, WhisperState } from "@/features/whisper/whisper.types";

export async function createWhisper(
  supabase: SupabaseClient,
  content: string
): Promise<WhisperPostPublic> {
  const { data, error } = await supabase.rpc("create_whisper", {
    p_content: content,
  });

  if (error) {
    console.error("Error creating whisper:", error);
    throw new Error("Failed to post whisper. Please try again.");
  }

  // The RPC returns an array with the newly created post
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error("Failed to create post. Invalid response from server.");
  }

  return data[0] as WhisperPostPublic;
}

export async function getOrCreateWhisperIdentity(
  supabase: SupabaseClient,
  schoolTag: string
): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_whisper_identity", {
    p_school_tag: schoolTag,
  });

  if (error) {
    console.error("Error fetching whisper identity:", error);
    throw new Error("Failed to fetch anonymous identity.");
  }

  return data as string;
}

export async function getMyWhisperState(
  supabase: SupabaseClient,
  postIds: string[]
): Promise<WhisperState[]> {
  const { data, error } = await supabase.rpc('get_my_whisper_state', {
    p_post_ids: postIds,
  });

  if (error) {
    console.error('Error fetching whisper interaction state:', error);
    throw new Error('Failed to fetch interaction state.');
  }

  // RPC returns array of { post_id, liked, is_mine }
  return data as WhisperState[];
}

export async function toggleWhisperLike(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  // RPC returns null/void — no authoritative state in the response.
  const { error } = await supabase.rpc('toggle_whisper_like', {
    p_post_id: postId,
  });

  if (error) {
    console.error('Error toggling like:', error);
    throw new Error('Failed to toggle like.');
  }
}

export async function deleteWhisper(
  supabase: SupabaseClient,
  postId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_whisper', {
    p_post_id: postId,
  });

  if (error) {
    console.error('Error deleting whisper:', error);
    throw new Error('Failed to delete whisper.');
  }

  return true;
}
