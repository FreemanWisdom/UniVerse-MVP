"use client";

import { useState } from "react";
import { WhisperPostUI } from "@/features/whisper/whisper.types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  // Local confirmation state so we avoid window.confirm (which blocks the
  // main thread and is not keyboard-accessible in all browsers).
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Report state: inline panel instead of window.prompt (blocked in some
  // browsers and not keyboard-accessible).
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

  const handleDeleteClick = () => {
    setIsConfirmingDelete(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    // Dismiss confirmation UI before calling up — parent will remove the card
    setIsConfirmingDelete(false);
    onDelete(post.id);
    // Note: setIsDeleting(false) is not needed because on success the card is
    // unmounted. On failure the parent keeps the card; isDeleting stays true
    // briefly then the component is still mounted, but since onDelete is async
    // in the parent, the card will remain. We reset it defensively:
    setIsDeleting(false);
  };

  const handleDeleteCancel = () => {
    setIsConfirmingDelete(false);
  };

  const likedLabel = post.liked
    ? `Unlike this whisper (${post.like_count ?? 0} likes)`
    : `Like this whisper (${post.like_count ?? 0} likes)`;



  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center space-x-2 min-w-0">
          <Badge
            variant="secondary"
            className="bg-slate-800 text-slate-200 hover:bg-slate-700 shrink-0"
          >
            {post.anon_label || "Anonymous"}
          </Badge>
          <span className="text-xs text-slate-500 truncate">{dateStr}</span>
        </div>

        {post.is_mine && !isConfirmingDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            aria-label="Delete this Whisper post"
            className="shrink-0 ml-2 border-red-800/60 text-red-400 hover:bg-red-950/40 hover:text-red-300"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        )}

        {/* Inline confirmation — keyboard-accessible, no window.confirm */}
        {post.is_mine && isConfirmingDelete && (
          <div
            className="flex items-center gap-2 shrink-0 ml-2"
            role="group"
            aria-label="Confirm deletion"
          >
            <span className="text-xs text-slate-400 hidden sm:inline">
              Delete?
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteConfirm}
              aria-label="Confirm: delete this Whisper"
              autoFocus
              className="border-red-800/60 text-red-400 hover:bg-red-950/40 hover:text-red-300"
            >
              Confirm
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteCancel}
              aria-label="Cancel deletion"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {post.content}
        </p>

        <div className="flex items-center space-x-6 mt-4 pt-2 border-t border-slate-800/50">
          {/* Like button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isLikeDisabled}
            aria-label={likedLabel}
            aria-pressed={post.liked ?? false}
            className={`flex items-center space-x-1.5 transition-colors min-w-0
              ${isLikeDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${post.liked ? "text-rose-400 hover:text-rose-300" : "text-slate-500 hover:text-slate-300"}
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={post.liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 shrink-0"
              aria-hidden="true"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <span className="text-xs" aria-hidden="true">
              {post.like_count ?? 0}
            </span>
            {/* Screen-reader only loading indicator */}
            {isLikeDisabled && (
              <span className="sr-only" aria-live="polite">
                Updating reaction…
              </span>
            )}
          </button>

          {/* Report button — the anonymous abuse path (legacy parity) */}
          {!isReported && !isReporting && (
            <button
              type="button"
              onClick={() => setIsReporting(true)}
              className="flex items-center space-x-1.5 transition-colors cursor-pointer text-slate-500 hover:text-slate-300"
              aria-label="Report this Whisper post"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 shrink-0"
                aria-hidden="true"
              >
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" x2="4" y1="22" y2="15" />
              </svg>
              <span className="text-xs" aria-hidden="true">
                Report
              </span>
            </button>
          )}
          {isReported && (
            <span className="text-xs text-slate-500" role="status">
              Reported
            </span>
          )}
        </div>

        {isReporting && (
          <div className="mt-4 space-y-2" role="group" aria-label="Report this Whisper">
            <label htmlFor={`report-reason-${post.id}`} className="sr-only">
              Reason for reporting
            </label>
            <textarea
              id={`report-reason-${post.id}`}
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="Why are you reporting this Whisper?"
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-surface-200 bg-surface-50 p-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
            />
            {reportError && (
              <p className="text-xs text-red-400" role="alert">{reportError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReportSubmit}
                disabled={isReportSubmitting || reportReason.trim().length === 0}
              >
                {isReportSubmitting ? "Submitting…" : "Submit report"}
              </Button>
              <Button
                variant="outline"
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
      </CardContent>
    </Card>
  );
}

