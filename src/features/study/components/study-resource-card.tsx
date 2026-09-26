"use client";

import { Button } from "@/components/ui/button";
import { StudyResource } from "@/features/study/study.types";

function formatDate(value: string | null): string {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "Size unavailable";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  return (
    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">{resource.title}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {resource.course_code ?? "General"} · {resource.resource_type}
          </p>
        </div>
        <span className="rounded-full border border-surface-300 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
          {resource.file_type ?? resource.mime_type ?? "file"}
        </span>
      </div>

      {resource.description ? (
        <p className="mt-3 text-sm text-slate-300">{resource.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
        {resource.category ? <span>{resource.category}</span> : null}
        {resource.academic_year ? <span>· {resource.academic_year}</span> : null}
        {resource.semester ? <span>· {resource.semester}</span> : null}
        {resource.department ? <span>· {resource.department}</span> : null}
        {resource.level ? <span>· {resource.level}</span> : null}
        <span>· {formatDate(resource.created_at)}</span>
        <span>· {formatSize(resource.file_size_bytes)}</span>
        <span>· {resource.download_count} downloads</span>
      </div>

      {saveError ? (
        <p className="mt-3 text-sm text-red-400" role="alert">{saveError}</p>
      ) : null}

      {accessError ? (
        <p className="mt-3 text-sm text-red-400" role="alert">{accessError}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
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
          variant="outline"
          onClick={() => onToggleSave(resource)}
          disabled={isTogglingSave}
          aria-pressed={isSaved}
        >
          {isTogglingSave ? "Saving…" : isSaved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
