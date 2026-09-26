export type StudyResourceType = "material" | "past_question" | "other";
export type StudySemester = "first" | "second" | "summer";

export interface StudyCourse {
  id: string;
  university: string;
  course_code: string;
  course_title: string;
  department: string | null;
  level: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Client-facing projection of a study resource.
 *
 * Deliberately omits private/internal columns (file_url, storage_path,
 * original_filename, tribe_id, uploader_id, moderation_status, university,
 * course_id): they are never displayed and must not be fetched to the
 * client. File access goes exclusively through the study-resource-access
 * Edge Function, which performs its own server-side authorization.
 */
export interface StudyResource {
  id: string;
  title: string;
  description: string | null;
  file_type: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  resource_type: StudyResourceType;
  category: string | null;
  course_code: string | null;
  department: string | null;
  level: string | null;
  academic_year: number | null;
  semester: StudySemester | null;
  download_count: number;
  created_at: string;
}

export interface StudyCursor {
  created_at: string;
  id: string;
}

export interface ListCoursesParams {
  search?: string;
  cursor?: StudyCursor;
}

export interface ListResourcesParams {
  courseCode?: string;
  resourceType?: StudyResourceType;
  semester?: StudySemester;
  academicYear?: number;
  search?: string;
  cursor?: StudyCursor;
}

export interface StudyResourceAccessResponse {
  url: string;
  expires_in: number;
  resource: {
    id: string;
    title: string;
    file_type: string | null;
    mime_type: string | null;
  };
}

export type StudyFilterValue = "all" | StudyResourceType;
export type StudyCourseFilterValue = "all" | string;
