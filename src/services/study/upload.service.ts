import { SupabaseClient } from "@supabase/supabase-js";
import { StudyResource, StudyResourceType, StudySemester } from "@/features/study/study.types";

// Verified live: private bucket, 50 MiB limit, campus-scoped read, and an
// INSERT policy requiring the path to start with <university>/<auth.uid()>/.
export const STUDY_STORAGE_BUCKET = "study-resources";
export const STUDY_MAX_FILE_SIZE_BYTES = 52_428_800;
export const STUDY_ALLOWED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const RESOURCE_COLUMNS =
  "id, title, description, course_code, department, level, category, resource_type, academic_year, semester, file_type, mime_type, file_size_bytes, download_count, created_at";

function sanitizeFilename(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, "_");
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "");
  return safe.length > 0 ? safe.slice(-120) : "upload";
}

async function getCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("session_expired");
  }

  return user.id;
}

export interface UploadStudyResourceInput {
  file: File;
  title: string;
  resourceType: StudyResourceType;
  description?: string;
  courseCode?: string;
  department?: string;
  level?: string;
  category?: string;
  academicYear?: number;
  semester?: StudySemester;
}

/**
 * Uploads a file to the study-resources bucket and inserts the matching
 * study_resources row. No RPC exists; RLS (uploader_id = auth.uid(),
 * university = study_current_university(), admin.user_allowed(uid,'upload'))
 * is the boundary. moderation_status defaults to 'active', so the upload
 * is visible immediately.
 */
export async function uploadStudyResource(
  supabase: SupabaseClient,
  university: string,
  input: UploadStudyResourceInput
): Promise<StudyResource> {
  const userId = await getCurrentUserId(supabase);

  const title = input.title.trim();
  if (!title || title.length > 200) {
    throw new Error("invalid_title");
  }
  if (!STUDY_ALLOWED_MIME_TYPES.includes(input.file.type)) {
    throw new Error("invalid_file_type");
  }
  if (input.file.size > STUDY_MAX_FILE_SIZE_BYTES) {
    throw new Error("file_too_large");
  }
  if (
    input.academicYear !== undefined &&
    (input.academicYear < 2000 || input.academicYear > 2100)
  ) {
    throw new Error("invalid_year");
  }

  const storagePath = `${university}/${userId}/${Date.now()}-${sanitizeFilename(input.file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(STUDY_STORAGE_BUCKET)
    .upload(storagePath, input.file, { contentType: input.file.type });

  if (uploadError) {
    throw new Error(`upload_failed: ${uploadError.message}`);
  }

  const { data, error } = await supabase
    .from("study_resources")
    .insert({
      title,
      description: input.description?.trim() || null,
      university,
      course_code: input.courseCode?.trim().toUpperCase() || null,
      department: input.department?.trim() || null,
      level: input.level?.trim() || null,
      category: input.category?.trim() || null,
      resource_type: input.resourceType,
      academic_year: input.academicYear ?? null,
      semester: input.semester ?? null,
      // Matches the live convention (verified on the existing UAES row):
      // file_url mirrors storage_path; access flows through the
      // study-resource-access edge function, never through this value.
      file_url: storagePath,
      storage_path: storagePath,
      mime_type: input.file.type,
      file_size_bytes: input.file.size,
      original_filename: input.file.name,
      uploader_id: userId,
    })
    .select(RESOURCE_COLUMNS)
    .single();

  if (error) {
    // Best-effort cleanup so a rejected insert doesn't orphan the file.
    await supabase.storage
      .from(STUDY_STORAGE_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);

    // 42501 = RLS violation, i.e. admin.user_allowed(uid,'upload') said no.
    throw new Error(error.code === "42501" ? "upload_not_allowed" : `insert_failed: ${error.message}`);
  }

  return data as StudyResource;
}

export interface MyStudyUpload {
  id: string;
  title: string;
  storage_path: string | null;
  created_at: string;
}

/** The user's own uploads (RLS: uploader_id = auth.uid(), active rows only). */
export async function listMyUploads(supabase: SupabaseClient): Promise<MyStudyUpload[]> {
  const userId = await getCurrentUserId(supabase);

  const { data, error } = await supabase
    .from("study_resources")
    .select("id, title, storage_path, created_at")
    .eq("uploader_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load your uploads: ${error.message}`);
  }

  return data as MyStudyUpload[];
}

/**
 * Deletes one of the user's own uploads: the row first (RLS: uploader-only),
 * then the storage object as best-effort cleanup. A failed storage removal
 * can leave an orphaned file, but never a dangling row.
 */
export async function deleteMyUpload(supabase: SupabaseClient, upload: MyStudyUpload): Promise<void> {
  const { error } = await supabase
    .from("study_resources")
    .delete()
    .eq("id", upload.id);

  if (error) {
    throw new Error(`Unable to delete this upload: ${error.message}`);
  }

  if (upload.storage_path) {
    await supabase.storage
      .from(STUDY_STORAGE_BUCKET)
      .remove([upload.storage_path])
      .catch(() => undefined);
  }
}
