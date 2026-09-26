export type StudyResourceType = "material" | "past_question" | "other";
export type StudySemester = "first" | "second" | "summer";
export type StudyResourceModerationStatus =
  | "active"
  | "pending"
  | "rejected"
  | "removed";

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

export interface StudyResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  mime_type: string | null;
  storage_path: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  resource_type: StudyResourceType;
  category: string | null;
  university: string;
  course_code: string | null;
  course_id: string | null;
  department: string | null;
  level: string | null;
  academic_year: number | null;
  semester: StudySemester | null;
  tribe_id: string | null;
  uploader_id: string;
  download_count: number;
  moderation_status: StudyResourceModerationStatus;
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
