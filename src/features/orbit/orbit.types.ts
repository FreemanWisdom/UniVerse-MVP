export type OrbitFeedMode = "for-you" | "trending";

export interface OrbitProfileSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  department: string | null;
  level: string | null;
  bio?: string | null;
}

export interface OrbitPost {
  id: string;
  created_at: string;
  content: string | null;
  school_tag: string | null;
  poster_name: string | null;
  poster_id: string;
  images: string[] | null;
  updated_at: string | null;
  edited_at: string | null;
  status: string | null;
  visibility: string | null;
  moderation_status: string | null;
  author: OrbitProfileSummary | null;
  like_count: number;
  comment_count: number;
  liked: boolean;
  share_count: number;
}

export interface OrbitComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  author: OrbitProfileSummary | null;
}

export interface OrbitLike { id: string; post_id: string; user_id: string; created_at: string; }
export interface OrbitMention { id: string; post_id: string; mentioned_user_id: string; created_at: string; }
export interface OrbitFeedCursor { createdAt: string; id: string; }
export interface OrbitRealtimeEvent { table: "orbit_feed"; eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown>; old: Record<string, unknown>; }
export interface OrbitPageResult { posts: OrbitPost[]; nextCursor: OrbitFeedCursor | null; }
