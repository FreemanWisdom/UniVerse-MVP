import { SupabaseClient } from "@supabase/supabase-js";
import { STUDY_CONSTANTS } from "@/features/study/study.constants";
import {
  ListCoursesParams,
  ListResourcesParams,
  StudyCourse,
  StudyCursor,
  StudyResource,
  StudyResourceAccessResponse,
} from "@/features/study/study.types";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const COURSE_COLUMNS =
  "id, university, course_code, course_title, department, level, created_at, updated_at";
const RESOURCE_COLUMNS =
  "id, title, description, file_url, file_type, mime_type, storage_path, original_filename, file_size_bytes, resource_type, category, university, course_code, course_id, department, level, academic_year, semester, tribe_id, uploader_id, download_count, moderation_status, created_at";

function escapeFilterValue(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
}

function applyCursor<T>(query: T, cursor?: StudyCursor): T {
  if (!cursor) return query;

  const createdAt = cursor.created_at.replace(/"/g, "");
  const id = cursor.id.replace(/"/g, "");
  return (query as { or: (filters: string) => T }).or(
    `created_at.lt."${createdAt}",and(created_at.eq."${createdAt}",id.lt."${id}")`
  );
}

export async function listCourses(
  supabase: SupabaseClient,
  { search, cursor }: ListCoursesParams = {}
): Promise<StudyCourse[]> {
  let query = supabase
    .from("study_courses")
    .select(COURSE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  const searchTerm = search ? escapeFilterValue(search) : "";
  if (searchTerm) {
    query = query.or(
      `course_code.ilike.%${searchTerm}%,course_title.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`
    );
  }

  const { data, error } = await applyCursor(query, cursor).limit(
    STUDY_CONSTANTS.COURSE_PAGE_SIZE
  );

  if (error) {
    throw new Error(`Unable to load study courses: ${error.message}`);
  }

  return data as StudyCourse[];
}

export async function listResources(
  supabase: SupabaseClient,
  {
    courseCode,
    resourceType,
    semester,
    academicYear,
    search,
    cursor,
  }: ListResourcesParams = {}
): Promise<StudyResource[]> {
  let query = supabase
    .from("study_resources")
    .select(RESOURCE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (courseCode) query = query.eq("course_code", courseCode);
  if (resourceType) query = query.eq("resource_type", resourceType);
  if (semester) query = query.eq("semester", semester);
  if (academicYear !== undefined) query = query.eq("academic_year", academicYear);

  const searchTerm = search ? escapeFilterValue(search) : "";
  if (searchTerm) {
    query = query.or(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,course_code.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%,level.ilike.%${searchTerm}%`
    );
  }

  const { data, error } = await applyCursor(query, cursor).limit(
    STUDY_CONSTANTS.RESOURCE_PAGE_SIZE
  );

  if (error) {
    throw new Error(`Unable to load study resources: ${error.message}`);
  }

  return data as StudyResource[];
}

export async function getCurrentUniversity(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.rpc("study_current_university");

  if (error) {
    throw new Error(`Unable to resolve your university: ${error.message}`);
  }

  return data || null;
}

export async function accessStudyResource(
  supabase: SupabaseClient,
  resourceId: string,
  download = false
): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("session_expired");
  }

  const { supabaseUrl } = getSupabasePublicConfig();
  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/study-resource-access`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      resource_id: resourceId,
      ...(download ? { download: true } : {}),
    }),
  });

  let payload: Partial<StudyResourceAccessResponse> & {
    message?: string;
    error?: { code?: string; message?: string };
    code?: string;
    details?: string;
  } = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const code = payload.code ?? payload.error?.code ?? "";
    const message = payload.message ?? payload.error?.message ?? "";

    if (response.status === 401 || code === "not_authenticated" || message.toLowerCase().includes("jwt")) {
      throw new Error("session_expired");
    }

    if (
      response.status === 403 ||
      code === "resource_not_accessible" ||
      message.toLowerCase().includes("resource_not_accessible")
    ) {
      throw new Error("not_available");
    }

    if (
      response.status === 404 ||
      code === "resource_not_found" ||
      message.toLowerCase().includes("resource_not_found") ||
      message.toLowerCase().includes("file_unavailable")
    ) {
      throw new Error("file_unavailable");
    }

    if (
      response.status === 409 ||
      code === "resource_file_not_migrated" ||
      message.toLowerCase().includes("resource_file_not_migrated")
    ) {
      throw new Error("file_unavailable");
    }

    throw new Error("generic_failure");
  }

  if (!payload.url) {
    throw new Error("file_unavailable");
  }

  return payload.url;
}
