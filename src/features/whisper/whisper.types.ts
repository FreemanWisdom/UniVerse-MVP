// Public read models for Whisper
// IMPORTANT: Never add `author_id` to these models.

export interface WhisperPostPublic {
  id: string;
  anon_label: string | null;
  content: string | null;
  created_at: string | null;
  like_count: number | null;
}

export interface WhisperCommentPublic {
  id: string;
  post_id: string | null;
  anon_label: string | null;
  content: string | null;
  created_at: string | null;
}

export interface WhisperState {
  post_id: string;
  liked: boolean;
  is_mine: boolean;
}

// UI Models

export interface WhisperPostUI extends WhisperPostPublic {
  // Merged state from WhisperState
  liked?: boolean;
  is_mine?: boolean;
}
