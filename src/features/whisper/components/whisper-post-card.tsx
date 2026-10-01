"use client";

import { useState } from "react";
import { WhisperPostUI } from "@/features/whisper/whisper.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { reportWhisper } from "@/services/whisper/interaction.service";

interface WhisperPostCardProps {
  post: WhisperPostUI;
  onToggleLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  /** True while a like mutation is in-flight for this specific post. */
  isLikeDisabled?: boolean;
}

export function WhisperPostCard({
  post,
  onToggleLike,
  onDelete,
  isLikeDisabled = false,
}: WhisperPostCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [reportError, setReportError] = useState("");

  const supabase = createClient();

  const handleReportSubmit = async () => {
    const reason = reportReason.trim();
    if (!reason || isReportSubmitting) return;
    setIsReportSubmitting(true);
    setReportError("");
    try {
      await reportWhisper(supabase, post.id, reason);
      setIsReported(true);
      setIsReporting(false);
    } catch (err) {
      setReportError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't submit your report. Please try again."
      );
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const dateStr = post.created_at
    ? new Date(post.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      })
    : "Unknown time";

  const handleLike = () => {
    if (isLikeDisabled) return;
    onToggleLike(post.id);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setIsConfirmingDelete(false);
    onDelete(post.id);
    setIsDeleting(false);
  };

  const likedLabel = post.liked
    ? `Unlike this whisper (${post.like_count ?? 0} likes)`
    : `Like this whisper (${post.like_count ?? 0} likes)`;

  return (
    <article className="rounded-lg border border-white/5 bg-surface-100/40 p-3 sm:p-4">
      {/* HEADER */}
      <header className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 font-semibold text-slate-300">
          <span className="text-xs">🤫</span>
        </div>
        <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-1.5">
          <Badge
            variant="secondary"
            className="bg-slate-800 text-slate-200 shrink-0 text-[10px] px-1.5 py-0"
          >
            {post.anon_label || "Anonymous"}
          </Badge>
          <span className="truncate text-xs text-slate-500">{dateStr}</span>
        </div>

        {post.is_mine && !isConfirmingDelete && (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isDeleting}
            aria-label="Delete this Whisper post"
            className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors shrink-0"
          >
            {isDeleting ? "..." : "Delete"}
          </button>
        )}

        {post.is_mine && isConfirmingDelete && (
          <div className="flex items-center gap-1 shrink-0" role="group">
            <button
              onClick={handleDeleteConfirm}
              aria-label="Confirm: delete this Whisper"
              className="rounded px-1.5 py-1 text-xs text-red-400 hover:bg-white/5 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setIsConfirmingDelete(false)}
              aria-label="Cancel deletion"
              className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* CONTENT */}
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
        {post.content}
      </p>

      {/* ACTIONS */}
      <footer className="mt-3 flex flex-wrap gap-1 border-t border-white/5 pt-2 text-xs">
        <button
          type="button"
          onClick={handleLike}
          disabled={isLikeDisabled}
          aria-label={likedLabel}
          aria-pressed={post.liked ?? false}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 ${
            isLikeDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } ${post.liked ? "text-rose-400" : "text-slate-400"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={post.liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
            aria-hidden="true"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span>{(post.like_count ?? 0) > 0 ? post.like_count : "Like"}</span>
        </button>

        {!isReported && !isReporting && (
          <button
            type="button"
            onClick={() => setIsReporting(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-400 transition-colors hover:bg-white/5"
            aria-label="Report this Whisper post"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" x2="4" y1="22" y2="15" />
            </svg>
            <span className="hidden sm:inline">Report</span>
          </button>
        )}
        {isReported && (
          <span className="px-2.5 py-1.5 text-slate-500" role="status">
            Reported
          </span>
        )}
      </footer>

      {isReporting && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3" role="group" aria-label="Report this Whisper">
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="Why are you reporting this Whisper?"
            maxLength={500}
            rows={2}
            className="w-full rounded-md border border-white/10 bg-surface-100/30 p-2 text-xs text-foreground outline-none focus:border-campus-500"
          />
          {reportError && <p className="text-xs text-red-400" role="alert">{reportError}</p>}
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleReportSubmit}
              disabled={isReportSubmitting || reportReason.trim().length === 0}
            >
              {isReportSubmitting ? "Submitting…" : "Submit"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsReporting(false);
                setReportError("");
              }}
              aria-label="Cancel report"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
