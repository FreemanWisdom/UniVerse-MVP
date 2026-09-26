import type { SupabaseClient } from "@supabase/supabase-js";
import { removeOrbitImages, uploadOrbitImages } from "./storage";

export async function createOrbitPost(supabase: SupabaseClient, userId: string, content: string, files: File[], mentionedUserIds: string[]): Promise<void> {
  const uploaded = await uploadOrbitImages(supabase, userId, files);
  const { data: post, error } = await supabase.from("orbit_feed").insert({ content: content.trim() || null, images: uploaded.urls, poster_id: userId }).select("id").single();
  if (error || !post) { await removeOrbitImages(supabase, uploaded.paths); throw new Error("We couldn't publish your post."); }
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
export async function toggleOrbitSave(supabase: SupabaseClient, postId: string, userId: string, saved: boolean): Promise<void> { const request = saved ? supabase.from("orbit_post_saves").delete().eq("post_id", postId).eq("user_id", userId) : supabase.from("orbit_post_saves").insert({ post_id: postId, user_id: userId }); const { error } = await request; if (error) throw new Error("Save update failed."); }
export async function createOrbitComment(supabase: SupabaseClient, postId: string, userId: string, content: string, parentCommentId: string | null): Promise<void> { const { error } = await supabase.from("orbit_comments").insert({ post_id: postId, user_id: userId, content: content.trim(), parent_comment_id: parentCommentId }); if (error) throw new Error("We couldn't add your comment."); }
export async function deleteOrbitComment(supabase: SupabaseClient, commentId: string): Promise<void> { const { error } = await supabase.from("orbit_comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId); if (error) throw new Error("We couldn't delete that comment."); }
export async function reportOrbitPost(supabase: SupabaseClient, postId: string, reason: string): Promise<void> { const { error } = await supabase.rpc("orbit_create_report", { p_content_type: "post", p_content_id: postId, p_reason: reason }); if (error) throw new Error("We couldn't submit the report."); }
