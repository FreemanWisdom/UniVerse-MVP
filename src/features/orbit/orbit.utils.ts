import type { OrbitFeedCursor, OrbitPost } from "./orbit.types";

export function displayName(profile: { full_name?: string | null } | null, fallback = "Student"): string {
  return profile?.full_name?.trim() || fallback;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

export function formatOrbitTime(value: string): string {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function cursorForPost(post: OrbitPost): OrbitFeedCursor { return { createdAt: post.created_at, id: post.id }; }

export function searchPosts(posts: OrbitPost[], query: string): OrbitPost[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return posts;
  return posts.filter((post) => [post.content, post.poster_name, post.school_tag].some((value) => value?.toLowerCase().includes(normalized)));
}

// Trending ranks purely by measured social engagement — likes, comments and
// shares. Saves are deliberately NOT a signal. Ties break newest first so
// ordering stays deterministic while pagination loads older pages.
export function rankTrending(posts: OrbitPost[]): OrbitPost[] {
  return [...posts].sort((a, b) => {
    const scoreA = a.like_count + a.comment_count + a.share_count;
    const scoreB = b.like_count + b.comment_count + b.share_count;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.created_at.localeCompare(a.created_at);
  });
}
