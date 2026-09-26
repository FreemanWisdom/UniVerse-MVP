import type { SupabaseClient } from "@supabase/supabase-js";
import { ORBIT_COMMENT_PAGE_SIZE, ORBIT_PAGE_SIZE } from "@/features/orbit/orbit.constants";
import type { OrbitComment, OrbitFeedCursor, OrbitPageResult, OrbitPost, OrbitProfileSummary } from "@/features/orbit/orbit.types";

const PROFILE_FIELDS = "id, full_name, avatar_url, university, department, level, bio";

async function hydratePosts(supabase: SupabaseClient, rows: Record<string, unknown>[], userId: string): Promise<OrbitPost[]> {
  const postIds = rows.map((row) => String(row.id));
  const posterIds = [...new Set(rows.map((row) => String(row.poster_id)))];
  const [{ data: likes }, { data: saves }, { data: comments }, { data: profiles }] = await Promise.all([
    supabase.from("orbit_post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("orbit_post_saves").select("post_id, user_id").in("post_id", postIds).eq("user_id", userId),
    supabase.from("orbit_comments").select("post_id").in("post_id", postIds).is("deleted_at", null),
    supabase.from("profiles").select(PROFILE_FIELDS).in("id", posterIds),
  ]);
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile as OrbitProfileSummary]));
  return rows.map((row) => {
    const postId = String(row.id);
    const postLikes = (likes ?? []).filter((like) => like.post_id === postId);
    return { ...row, id: postId, author: profileMap.get(String(row.poster_id)) ?? null, like_count: postLikes.length, comment_count: (comments ?? []).filter((comment) => comment.post_id === postId).length, liked: postLikes.some((like) => like.user_id === userId), saved: (saves ?? []).some((save) => save.post_id === postId) } as OrbitPost;
  });
}

export async function loadOrbitFeed(supabase: SupabaseClient, userId: string, campus: string, cursor?: OrbitFeedCursor): Promise<OrbitPageResult> {
  let query = supabase.from("orbit_feed").select("id, created_at, content, school_tag, poster_name, poster_id, images, updated_at, edited_at, status, visibility, moderation_status").eq("school_tag", campus).eq("status", "active").eq("visibility", "campus").eq("moderation_status", "active").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(ORBIT_PAGE_SIZE);
  if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  const { data, error } = await query;
  if (error) throw new Error("We couldn't load the Orbit feed.");
  const posts = await hydratePosts(supabase, (data ?? []) as Record<string, unknown>[], userId);
  const last = posts.at(-1);
  return { posts, nextCursor: posts.length === ORBIT_PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null };
}

export async function loadOrbitComments(supabase: SupabaseClient, postId: string, cursor?: OrbitFeedCursor): Promise<{ comments: OrbitComment[]; nextCursor: OrbitFeedCursor | null }> {
  let query = supabase.from("orbit_comments").select(`id, post_id, user_id, parent_comment_id, content, created_at, updated_at, deleted_at`).eq("post_id", postId).is("deleted_at", null).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(ORBIT_COMMENT_PAGE_SIZE);
  if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  const { data, error } = await query;
  if (error) throw new Error("We couldn't load comments.");
  const rows = (data ?? []) as OrbitComment[];
  const profiles = rows.length ? (await supabase.from("profiles").select(PROFILE_FIELDS).in("id", rows.map((row) => row.user_id))).data ?? [] : [];
  const profileMap = new Map(profiles.map((profile) => [String(profile.id), profile as OrbitProfileSummary]));
  const comments = rows.map((comment) => ({ ...comment, author: profileMap.get(comment.user_id) ?? null }));
  const last = comments.at(-1);
  return { comments, nextCursor: comments.length === ORBIT_COMMENT_PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null };
}

export async function searchOrbitProfiles(supabase: SupabaseClient, query: string, campus: string): Promise<OrbitProfileSummary[]> {
  const { data, error } = await supabase.from("profiles").select(PROFILE_FIELDS).eq("university", campus).ilike("full_name", `%${query}%`).limit(10);
  if (error) throw new Error("Profile search is unavailable right now.");
  return (data ?? []) as OrbitProfileSummary[];
}
