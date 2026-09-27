export interface StudentProfile {
  id: string;
  user_id?: string;
  full_name: string | null;
  username?: string | null;
  avatar_url: string | null;
  university: string | null;
  department: string | null;
  level: string | null;
  bio: string | null;
  interests?: string[] | null;
  is_verified?: boolean;
  student_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdatePayload {
  full_name?: string | null;
  department?: string | null;
  level?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  interests?: string[] | null;
}
