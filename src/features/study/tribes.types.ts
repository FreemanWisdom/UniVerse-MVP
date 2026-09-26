import { StudyCursor } from "@/features/study/study.types";

/**
 * Client-facing projection of a study tribe.
 * Deliberately omits creator_id and moderation_status: never displayed,
 * must not reach the client.
 */
export interface Tribe {
  id: string;
  name: string;
  description: string | null;
  course_code: string | null;
  department: string | null;
  level: string | null;
  category: string | null;
  created_at: string;
}

export interface CreateTribeInput {
  name: string;
  description?: string;
  courseCode?: string;
  department?: string;
  level?: string;
  category?: string;
}

export interface ListTribesParams {
  search?: string;
  cursor?: StudyCursor;
}

/** Client-facing tribe post. Own-post detection uses a separate id-only query. */
export interface TribePost {
  id: string;
  content: string;
  created_at: string;
}

export interface ListTribePostsParams {
  cursor?: StudyCursor;
}
