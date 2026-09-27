import { SupabaseClient } from "@supabase/supabase-js";
import { WhisperPostPublic, WhisperCommentPublic } from "@/features/whisper/whisper.types";
import { WHISPER_CONSTANTS } from "@/features/whisper/whisper.constants";

export async function getLatestWhispers(
  supabase: SupabaseClient,
  cursorCreatedAt?: string
): Promise<WhisperPostPublic[]> {
  let query = supabase
    .from("whisper_posts_public")
    .select("*")
    .order("created_at", { ascending: false });

  if (cursorCreatedAt) {
    query = query.lt("created_at", cursorCreatedAt);
  }

  const { data, error } = await query.limit(WHISPER_CONSTANTS.FEED_PAGE_SIZE);

  if (error) {
    console.error("Error fetching latest whispers:", error);
    throw new Error("Failed to fetch recent posts. Please try again.");
  }

  return data as WhisperPostPublic[];
}

export async function getTrendingWhispers(
  supabase: SupabaseClient,
  offset: number
): Promise<WhisperPostPublic[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - WHISPER_CONSTANTS.TRENDING_DAYS_WINDOW);

  const { data, error } = await supabase
    .from("whisper_posts_public")
    .select("*")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("like_count", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + WHISPER_CONSTANTS.FEED_PAGE_SIZE - 1);

  if (error) {
    console.error("Error fetching trending whispers:", error);
    throw new Error("Failed to fetch trending posts. Please try again.");
  }

  return data as WhisperPostPublic[];
}

export async function getWhisperCommentCount(
  supabase: SupabaseClient,
  postId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("whisper_comments_public")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  if (error) {
    // Log the readable message: the raw error object serializes as {} in
    // the console. A permission-denied here means the request left without
    // a session (anon has no grant on whisper_comments_public) — benign,
    // the count falls back to 0.
    console.error("Error fetching comment count:", error.message ?? error, {
      code: (error as { code?: string }).code,
    });
    return 0; // Fallback safely to 0
  }

  return count ?? 0;
}

export async function getWhisperComments(
  supabase: SupabaseClient,
  postId: string,
  cursorCreatedAt?: string,
  cursorId?: string
): Promise<WhisperCommentPublic[]> {
  let query = supabase
    .from("whisper_comments_public")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (cursorCreatedAt && cursorId) {
    // Composite cursor for stable pagination:
    // (created_at > cursorCreatedAt) OR (created_at == cursorCreatedAt AND id > cursorId)
    query = query.or(
      `created_at.gt."${cursorCreatedAt}",and(created_at.eq."${cursorCreatedAt}",id.gt."${cursorId}")`
    );
  }

  const { data, error } = await query.limit(WHISPER_CONSTANTS.COMMENT_PAGE_SIZE);

  if (error) {
    console.error("Error fetching comments:", error);
    throw new Error("Unable to load comments. Please try again.");
  }

  return data as WhisperCommentPublic[];
}
