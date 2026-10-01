"use client";

import { Button } from "@/components/ui/button";
import { StudyResource } from "@/features/study/study.types";
import { StudyMeta } from "./study-ui";

function formatDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_LABEL: Record<string, string> = {
  material: "Material",
  past_question: "Past question",
  other: "Other",
};

export interface StudyResourceCardProps {
  resource: StudyResource;
  isSaved: boolean;
  isTogglingSave: boolean;
  saveError: string | null;
  accessBusy: boolean;
  accessError: string | null;
  onToggleSave: (resource: StudyResource) => void;
  onOpen: (resource: StudyResource) => void;
  onDownload: (resource: StudyResource) => void;
}

export function StudyResourceCard({
  resource,
  isSaved,
  isTogglingSave,
  saveError,
  accessBusy,
  accessError,
  onToggleSave,
  onOpen,
  onDownload,
}: StudyResourceCardProps) {
  const typeLabel = TYPE_LABEL[resource.resource_type] ?? resource.resource_type;
  const fileType = resource.file_type ?? resource.mime_type ?? null;

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-50/50 p-3 transition-colors hover:border-surface-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="truncate text-sm font-medium text-foreground">{resource.title}</p>
            <span className="shrink-0 rounded-full border border-surface-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
              {typeLabel}
            </span>
          </div>
          {resource.description ? (
            <p className="text-xs leading-relaxed text-slate-300 line-clamp-2">{resource.description}</p>
          ) : null}
          <StudyMeta
            items={[
              resource.course_code ?? "General",
              resource.category,
              resource.semester,
              resource.academic_year ? String(resource.academic_year) : null,
              resource.department,
              resource.level,
              fileType,
              formatSize(resource.file_size_bytes),
              formatDate(resource.created_at),
              `${resource.download_count} downloads`,
            ]}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpen(resource)}
            disabled={accessBusy}
          >
            {accessBusy ? "Opening…" : "Open"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDownload(resource)}
            disabled={accessBusy}
          >
            {accessBusy ? "Preparing…" : "Download"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isSaved ? "secondary" : "ghost"}
            onClick={() => onToggleSave(resource)}
            disabled={isTogglingSave}
            aria-pressed={isSaved}
          >
            {isTogglingSave ? "…" : isSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {saveError ? (
        <p className="mt-2 text-xs text-red-400" role="alert">{saveError}</p>
      ) : null}

      {accessError ? (
        <p className="mt-2 text-xs text-red-400" role="alert">{accessError}</p>
      ) : null}
    </div>
  );
}
