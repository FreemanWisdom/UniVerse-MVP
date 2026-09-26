export interface CampusChatDiscoverStudent {
  avatar_url: string;
  bio: string;
  department: string;
  full_name: string;
  id: string;
  is_verified: boolean;
  level: string;
  university: string;
}

export interface CampusChatSearchStudent {
  avatar_url: string;
  bio: string;
  department: string;
  full_name: string;
  id: string;
  is_verified: boolean;
  level: string;
  reputation_stars: number;
  university: string;
}

export interface CampusChatMessageRequest {
  conversation_id: string | null;
  created_at: string;
  id: string;
  message: string;
  recipient_avatar_url: string;
  recipient_full_name: string;
  recipient_id: string;
  responded_at: string | null;
  sender_avatar_url: string;
  sender_department: string;
  sender_full_name: string;
  sender_id: string;
  sender_level: string;
  sender_university: string;
  status: string;
}

export interface Conversation {
  created_at: string;
  created_by: string | null;
  id: string;
  is_group: boolean;
  school_tag: string | null;
  title: string | null;
}

export interface ConversationMember {
  conversation_id: string;
  joined_at: string;
  last_read_at: string | null;
  user_id: string;
}

export interface Message {
  content: string;
  conversation_id: string;
  created_at: string;
  id: string;
  moderation_status: string;
  sender_id: string;
}

