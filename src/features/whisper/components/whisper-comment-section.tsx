import { useEffect } from "react";
import { useWhisperComments } from "@/features/whisper/hooks/use-whisper-comments";
import { WhisperCommentPublic } from "@/features/whisper/whisper.types";
import { Button } from "@/components/ui/button";

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface WhisperCommentSectionProps {
  postId: string;
  isExpanded: boolean;
}

export function WhisperCommentSection({
  postId,
  isExpanded,
}: WhisperCommentSectionProps) {
  const {
    comments,
    isLoading,
    error,
    hasMore,
    loadComments,
    loadMoreComments,
    isInitialLoadComplete,
  } = useWhisperComments(postId);

  useEffect(() => {
    if (isExpanded && !isInitialLoadComplete && !isLoading) {
      loadComments();
    }
  }, [isExpanded, isInitialLoadComplete, isLoading, loadComments]);

  // Return null when collapsed to hide the UI, but keep the component mounted
  // in the parent so that the hook's state (loaded comments) is preserved.
  if (!isExpanded) {
    return null;
  }

  return (
    <div className="pt-4 mt-4 border-t border-slate-800">
      <div className="space-y-4 mb-4">
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-200">
                {comment.anon_label || "Anonymous"}
              </span>
              <span className="text-xs text-slate-500">
                {comment.created_at ? getRelativeTime(comment.created_at) : "just now"}
              </span>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>
        ))}

        {isLoading && comments.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-2">
            Loading comments...
          </div>
        )}

        {error && (
          <div className="text-center text-red-400 text-sm py-2">{error}</div>
        )}

        {!isLoading && !error && isInitialLoadComplete && comments.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-2 italic">
            No comments yet.
          </div>
        )}

        {hasMore && comments.length > 0 && !error && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMoreComments}
              disabled={isLoading}
              className="text-xs text-slate-400 hover:text-slate-300"
            >
              {isLoading ? "Loading..." : "Load more comments"}
            </Button>
          </div>
        )}
      </div>

      {/* Composer (Disabled) */}
      <div className="flex gap-2 relative">
        <textarea
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 resize-none opacity-50 cursor-not-allowed"
          rows={1}
          placeholder="Commenting is currently unavailable"
          disabled
          aria-label="Write a comment"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled
          className="shrink-0 opacity-50 cursor-not-allowed w-9 px-0 flex justify-center items-center"
          aria-label="Submit comment"
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
            className="w-4 h-4"
            aria-hidden="true"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </Button>
      </div>
    </div>
  );
}
