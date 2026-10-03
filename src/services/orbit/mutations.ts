import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMessage } from "@/services/chat/conversations.service";
import { ORBIT_SHARES_TRACKED } from "@/features/orbit/orbit.constants";
import { removeOrbitImages, uploadOrbitImages } from "./storage";

export async function createOrbitPost(supabase: SupabaseClient, userId: string, university: string, content: string, files: File[], mentionedUserIds: string[]): Promise<void> {
  if (!university.trim()) {
    throw new Error("Your school/campus information is unavailable. Please update your profile.");
  }
  const uploaded = await uploadOrbitImages(supabase, userId, files);
  const { data: post, error } = await supabase.from("orbit_feed").insert({ content: content.trim() || null, images: uploaded.urls, poster_id: userId, school_tag: university }).select("id").single();
  if (error || !post) {
    await removeOrbitImages(supabase, uploaded.paths);
    const detail = (error as { message?: string } | null)?.message ?? "";
    throw new Error(
      detail.replace(/^rate_limit_exceeded:\s*/i, "") || "We couldn't publish your post."
    );
  }
  if (mentionedUserIds.length) {
    const { error: mentionError } = await supabase.from("orbit_post_mentions").upsert(mentionedUserIds.map((mentioned_user_id) => ({ post_id: post.id, mentioned_user_id })), { onConflict: "post_id,mentioned_user_id", ignoreDuplicates: true });
    if (mentionError) console.error("Orbit mention insertion failed", mentionError);
  }
}

export async function updateOrbitPost(supabase: SupabaseClient, postId: string, content: string): Promise<void> {
  const { error } = await supabase.from("orbit_feed").update({ content: content.trim(), edited_at: new Date().toISOString() }).eq("id", postId);
  if (error) throw new Error("We couldn't update that post.");
}
export async function deleteOrbitPost(supabase: SupabaseClient, postId: string): Promise<void> { const { error } = await supabase.from("orbit_feed").update({ status: "deleted" }).eq("id", postId); if (error) throw new Error("We couldn't delete that post."); }
export async function toggleOrbitLike(supabase: SupabaseClient, postId: string, userId: string, liked: boolean): Promise<void> { const request = liked ? supabase.from("orbit_post_likes").delete().eq("post_id", postId).eq("user_id", userId) : supabase.from("orbit_post_likes").insert({ post_id: postId, user_id: userId }); const { error } = await request; if (error) throw new Error("Like update failed."); }
// Sharing delivers the post through the EXISTING chat system: the same
// sendMessage() the chat module uses, so every message RLS/policy still
// applies (conversation membership, user_allowed, blocks in both
// directions, write rate limit) and the existing notification trigger
// creates the recipient's campus_message notification. No second
// messaging system is introduced.
// The orbit_post_shares row is bookkeeping for trending counts; until the
// phase4 migration is applied the insert fails silently (shares count as
// zero) and the shared message still goes through.
export async function shareOrbitPost(
  supabase: SupabaseClient,
  postId: string,
  post: { content: string | null; images: string[] | null },
  conversationId: string,
  recipientId: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const trimmed = (post.content ?? "").trim();
  const preview = trimmed ? `"${trimmed.slice(0, 140)}${trimmed.length > 140 ? "…" : ""}"` : post.images?.length ? "a photo post" : "a post";
  const message = `Shared an Orbit post with you.\n${preview}\n/orbit?post=${postId}`;

  await sendMessage(supabase, conversationId, message);

  // Trending bookkeeping — skipped until the phase4 migration is applied.
  if (ORBIT_SHARES_TRACKED) {
    const { error: shareError } = await supabase
      .from("orbit_post_shares")
      .upsert({ post_id: postId, shared_by: userId, shared_to: recipientId }, { onConflict: "post_id,shared_by,shared_to", ignoreDuplicates: true });
    if (shareError) console.warn("orbit_post_shares not recorded", shareError.message);
  }
}
export async function createOrbitComment(supabase: SupabaseClient, postId: string, userId: string, content: string, parentCommentId: string | null): Promise<void> { const { error } = await supabase.from("orbit_comments").insert({ post_id: postId, user_id: userId, content: content.trim(), parent_comment_id: parentCommentId }); if (error) throw new Error("We couldn't add your comment."); }
export async function deleteOrbitComment(supabase: SupabaseClient, commentId: string): Promise<void> { const { error } = await supabase.from("orbit_comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId); if (error) throw new Error("We couldn't delete your comment."); }
export async function reportOrbitPost(supabase: SupabaseClient, postId: string, reason: string): Promise<void> { const { error } = await supabase.rpc("orbit_create_report", { p_content_type: "post", p_content_id: postId, p_reason: reason }); if (error) throw new Error("We couldn't submit the report."); }
