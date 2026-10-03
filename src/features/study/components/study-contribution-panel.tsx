"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconFileText } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  deleteMyUpload,
  listMyUploads,
  STUDY_ALLOWED_MIME_TYPES,
  STUDY_MAX_FILE_SIZE_BYTES,
  uploadStudyResource,
  MyStudyUpload,
} from "@/services/study/upload.service";
import {
  StudyResource,
  StudyResourceType,
  StudySemester,
} from "@/features/study/study.types";
import { StudySelect, StudySectionHeader } from "./study-ui";

const RESOURCE_TYPE_OPTIONS: Array<{ value: StudyResourceType; label: string }> = [
  { value: "material", label: "Material" },
  { value: "past_question", label: "Past question" },
  { value: "other", label: "Other" },
];

const SEMESTER_OPTIONS: Array<{ value: StudySemester; label: string }> = [
  { value: "first", label: "First semester" },
  { value: "second", label: "Second semester" },
  { value: "summer", label: "Summer" },
];

const ACCEPT_ATTR = ".pdf,.doc,.docx,.ppt,.pptx,.txt";

interface UploadFormState {
  title: string;
  description: string;
  courseCode: string;
  department: string;
  level: string;
  category: string;
  academicYear: string;
  semester: "" | StudySemester;
  resourceType: StudyResourceType;
}

const EMPTY_FORM: UploadFormState = {
  title: "",
  description: "",
  courseCode: "",
  department: "",
  level: "",
  category: "",
  academicYear: "",
  semester: "",
  resourceType: "material",
};

function formatMaxSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export interface StudyContributionPanelProps {
  university: string;
  onUploaded: (resource: StudyResource) => void;
  onDeleted: (resourceId: string) => void;
}

export function StudyContributionPanel({ university, onUploaded, onDeleted }: StudyContributionPanelProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<UploadFormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [showMyUploads, setShowMyUploads] = useState(false);
  const [uploadsLoaded, setUploadsLoaded] = useState(false);
  const [uploads, setUploads] = useState<MyStudyUpload[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadsError, setUploadsError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // My-uploads list loads once when the section is first expanded
  // (same lazy pattern as the Whisper comment sections).
  useEffect(() => {
    if (!showMyUploads || uploadsLoaded) return;

    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      setUploadsLoading(true);
      setUploadsError(null);

      try {
        const nextUploads = await listMyUploads(supabase);
        if (!cancelled) {
          setUploads(nextUploads);
          setUploadsLoaded(true);
        }
      } catch (loadError) {
        if (!cancelled) {
          setUploadsError(loadError instanceof Error ? loadError.message : "Unable to load your uploads.");
        }
      } finally {
        if (!cancelled) {
          setUploadsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [showMyUploads, uploadsLoaded]);

  const handleUpload = async () => {
    if (!file) {
      setUploadError("Choose a file first.");
      return;
    }

    const supabase = createClient();
    setUploading(true);
    setUploadError(null);

    try {
      const resource = await uploadStudyResource(supabase, university, {
        file,
        title: form.title,
        resourceType: form.resourceType,
        description: form.description || undefined,
        courseCode: form.courseCode || undefined,
        department: form.department || undefined,
        level: form.level || undefined,
        category: form.category || undefined,
        academicYear: form.academicYear ? Number(form.academicYear) : undefined,
        semester: form.semester || undefined,
      });

      onUploaded(resource);
      setUploadsLoaded(false);
      setForm(EMPTY_FORM);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setShowUpload(false);
    } catch (uploadFailed) {
      const message = uploadFailed instanceof Error ? uploadFailed.message : "";
      setUploadError(
        message === "invalid_title"
          ? "Add a title (200 characters max)."
          : message === "invalid_file_type"
            ? "Only PDF, Word, PowerPoint, and plain-text files are supported."
            : message === "file_too_large"
              ? `Files must be ${formatMaxSize(STUDY_MAX_FILE_SIZE_BYTES)} or smaller.`
              : message === "invalid_year"
                ? "Academic year must be between 2000 and 2100."
                : message === "upload_not_allowed"
                  ? "Uploading is temporarily unavailable for your account."
                  : message === "no_university"
                    ? "Set your university in your profile before uploading."
                    : message === "session_expired"
                      ? "Your session expired. Please sign in again."
                      : "We couldn't upload this resource. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (upload: MyStudyUpload) => {
    const supabase = createClient();
    setDeletingId(upload.id);

    try {
      await deleteMyUpload(supabase, upload);
      setUploads((current) => current.filter((item) => item.id !== upload.id));
      onDeleted(upload.id);
    } catch (deleteError) {
      setUploadsError(
        deleteError instanceof Error && deleteError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : "We couldn't delete this upload. Please try again."
      );
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  return (
    <section className="space-y-2">
      <StudySectionHeader title="Contribute" subtitle="Share materials with your campus" />
      <div className="space-y-3 rounded-lg border border-surface-200 bg-surface-50/30 p-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setShowUpload((current) => !current)}>
            {showUpload ? "Cancel" : "Upload resource"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowMyUploads((current) => !current)}
            aria-expanded={showMyUploads}
          >
            {showMyUploads ? "Hide my uploads" : "My uploads"}
          </Button>
        </div>

        {showUpload ? (
          <div className="space-y-3 border-t border-surface-200 pt-3">
            <Input
              aria-label="Resource title"
              placeholder="Title (required)"
              value={form.title}
              maxLength={200}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />

            <div>
              <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-xs transition-colors hover:border-surface-400">
                <IconFileText size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-slate-300">
                  {file ? file.name : "Choose a file…"}
                </span>
                <span className="shrink-0 rounded-md border border-surface-300 px-2 py-1 text-[11px] font-medium text-slate-400">
                  Browse
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  aria-label="Resource file (PDF, Word, PowerPoint, or plain text)"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                PDF, Word, PowerPoint, or plain text · {formatMaxSize(STUDY_MAX_FILE_SIZE_BYTES)} max
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StudySelect
                aria-label="Resource type"
                value={form.resourceType}
                onChange={(value) =>
                  setForm((current) => ({ ...current, resourceType: value as StudyResourceType }))
                }
              >
                {RESOURCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </StudySelect>
              <StudySelect
                aria-label="Semester"
                value={form.semester}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    semester: value as "" | StudySemester,
                  }))
                }
              >
                <option value="">Semester (optional)</option>
                {SEMESTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </StudySelect>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                aria-label="Course code"
                placeholder="Course code (optional)"
                value={form.courseCode}
                onChange={(event) => setForm((current) => ({ ...current, courseCode: event.target.value }))}
              />
              <Input
                aria-label="Academic year"
                placeholder="Academic year, e.g. 2026 (optional)"
                inputMode="numeric"
                value={form.academicYear}
                onChange={(event) =>
                  setForm((current) => ({ ...current, academicYear: event.target.value.replace(/\D/g, "") }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                aria-label="Department"
                placeholder="Department (optional)"
                value={form.department}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              />
              <Input
                aria-label="Level"
                placeholder="Level (optional)"
                value={form.level}
                onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
              />
              <Input
                aria-label="Category"
                placeholder="Category (optional)"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              />
            </div>

            <Input
              aria-label="Description"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />

            {uploadError ? (
              <p className="text-sm text-red-400" role="alert">{uploadError}</p>
            ) : null}

            <Button
              type="button"
              size="sm"
              onClick={() => void handleUpload()}
              disabled={uploading || form.title.trim().length === 0 || !file}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        ) : null}

        {showMyUploads ? (
          <div className="space-y-2 border-t border-surface-200 pt-3">
            {uploadsLoading ? (
              <p className="text-sm text-slate-400" aria-live="polite">Loading your uploads…</p>
            ) : uploadsError ? (
              <p className="text-sm text-red-400" role="alert">{uploadsError}</p>
            ) : uploads.length === 0 ? (
              <p className="text-sm text-slate-400">You haven&#39;t uploaded any resources yet.</p>
            ) : (
              uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-200 bg-surface-50/50 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-slate-200">{upload.title}</span>
                  {deleteConfirmId === upload.id ? (
                    <span className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDelete(upload)}
                        disabled={deletingId === upload.id}
                      >
                        {deletingId === upload.id ? "Deleting…" : "Confirm delete"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirmId(upload.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
