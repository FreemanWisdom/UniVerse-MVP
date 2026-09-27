import { SupabaseClient } from "@supabase/supabase-js";
import { WhisperPostPublic } from "@/features/whisper/whisper.types";
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

