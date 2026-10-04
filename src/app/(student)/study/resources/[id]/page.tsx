"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { listResources, accessStudyResource } from "@/services/study/study.service";
import type { StudyResource } from "@/features/study/study.types";
import { fileKindLabel, formatSize } from "@/features/study/components/study-resource-card";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { IconFileText, IconExternal } from "@/components/icons";

/**
 * In-app resource viewer. "Open" on a study resource navigates here
 * instead of window.open()ing the signed URL in a new browser tab, so
 * students never leave the app. The signed URL is still short-lived and
 * never shown in the address bar.
 *
 * Images render inline; PDFs embed natively; anything the browser cannot
 * render (Word, PowerPoint, …) gets a friendly card with the same
 * Download / open-in-browser escape hatches.
 */
function viewerKind(resource: StudyResource): "image" | "pdf" | "external" {
  const mime = resource.mime_type ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf")) return "pdf";
  // some older rows only carry file_type extensions
  const ext = (resource.file_type ?? "").toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif)$/.test(ext)) return "image";
  if (mime.startsWith("text/") || /\.(txt|csv|md)$/.test(ext)) return "external";
  return "external";
}

function friendlyError(kind: string): string {
  switch (kind) {
    case "session_expired":
      return "Your session expired. Please sign in again.";
    case "not_available":
      return "This resource is not available to your campus.";
    case "file_unavailable":
      return "This file is unavailable right now.";
    default:
      return "We couldn't open this resource. Please try again.";
  }
}

export default function ResourceViewerPage() {
  const params = useParams<{ id: string }>();
  const resourceId = params.id;

  const [resource, setResource] = useState<StudyResource | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setBusy(true);
      setLoadError("");
      try {
        const supabase = createClient();
        const [match] = await listResources(supabase, { resourceIds: [resourceId] });
        if (cancelled) return;
        if (!match) {
          setLoadError("This resource is not available to your campus.");
          return;
        }
        setResource(match);
        const url = await accessStudyResource(supabase, resourceId, false);
        if (cancelled) return;
        setViewUrl(url);
      } catch (error) {
        if (cancelled) return;
        setLoadError(friendlyError(error instanceof Error ? error.message : ""));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const handleDownload = useCallback(async () => {
    if (!resource) return;
    setDownloadBusy(true);
    try {
      const supabase = createClient();
      const url = await accessStudyResource(supabase, resource.id, true);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = resource.title;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      setLoadError(friendlyError(error instanceof Error ? error.message : ""));
    } finally {
      setDownloadBusy(false);
    }
  }, [resource]);

  const kind = resource ? viewerKind(resource) : "external";
  const fileKind = resource ? fileKindLabel(resource.file_type ?? resource.mime_type ?? null) : null;

  return (
    <section className="flex min-h-dvh flex-col" aria-label="Resource viewer">
      <header className="flex items-center gap-2 border-b border-surface-200 px-3 py-2.5">
        <BackButton href="/study" label="Back to Study" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {resource ? resource.title : busy ? "Opening…" : "Resource"}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {resource ? [resource.course_code, fileKind, formatSize(resource.file_size_bytes)].filter(Boolean).join(" · ") : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!resource || downloadBusy}
            aria-label="Download resource"
          >
            <IconFileText size={14} aria-hidden="true" />
            <span className="hidden sm:inline">{downloadBusy ? "Preparing…" : "Download"}</span>
          </Button>
          {viewUrl ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.open(viewUrl, "_blank", "noopener,noreferrer")}
              aria-label="Open in browser"
            >
              <IconExternal size={14} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 p-3">
        {busy ? (
          <div className="flex h-full min-h-[50dvh] items-center justify-center">
            <p className="text-sm text-slate-400" role="status">Preparing resource…</p>
          </div>
        ) : loadError ? (
          <div className="mx-auto mt-10 max-w-sm rounded-lg border border-surface-200 bg-surface-50/50 p-5 text-center">
            <p className="text-sm text-foreground">{loadError}</p>
            <Button type="button" size="sm" className="mt-3" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        ) : viewUrl && resource ? (
          kind === "image" ? (
            <div className="flex h-full items-center justify-center overflow-hidden rounded-lg border border-surface-200 bg-surface-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote signed storage URL */}
              <img src={viewUrl} alt={resource.title} className="max-h-full max-w-full rounded object-contain" />
            </div>
          ) : kind === "pdf" ? (
            <div className="h-full min-h-[70dvh] overflow-hidden rounded-lg border border-surface-200 bg-surface-100">
              <object data={viewUrl} type="application/pdf" className="h-full w-full" aria-label={resource.title}>
                <iframe src={viewUrl} title={resource.title} className="h-full w-full" />
              </object>
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-sm rounded-lg border border-surface-200 bg-surface-50/50 p-6 text-center">
              <p className="text-sm font-medium text-foreground">{resource.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                {fileKind ?? "File"} · {formatSize(resource.file_size_bytes)}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                This file type can&apos;t be previewed inside the app. You can download it or open it in your browser.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button type="button" size="sm" onClick={handleDownload} disabled={downloadBusy}>
                  {downloadBusy ? "Preparing…" : "Download"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(viewUrl, "_blank", "noopener,noreferrer")}
                >
                  Open in browser
                </Button>
              </div>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
