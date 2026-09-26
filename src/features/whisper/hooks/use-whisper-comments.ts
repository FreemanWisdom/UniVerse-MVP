import { useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { WhisperCommentPublic } from "@/features/whisper/whisper.types";
import { WHISPER_CONSTANTS } from "@/features/whisper/whisper.constants";
import { getWhisperComments } from "@/services/whisper/feed.service";

interface UseWhisperCommentsReturn {
  comments: WhisperCommentPublic[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadComments: () => Promise<void>;
  loadMoreComments: () => Promise<void>;
  isInitialLoadComplete: boolean;
}

export function useWhisperComments(postId: string): UseWhisperCommentsReturn {
  const [comments, setComments] = useState<WhisperCommentPublic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // We can reuse a single browser client for standard queries.
  // Ideally, it should come from a React context, but creating it here is fine for now.
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Guard against stale responses or duplicate fetches
  const requestRef = useRef(0);

  const loadComments = useCallback(async () => {
    // If already loaded successfully, don't fetch again automatically on toggle
    if (isInitialLoadComplete) return;

    const reqId = ++requestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getWhisperComments(supabase, postId);
      if (reqId === requestRef.current) {
        setComments(data);
        setHasMore(data.length === WHISPER_CONSTANTS.COMMENT_PAGE_SIZE);
        setIsInitialLoadComplete(true);
      }
    } catch (err: any) {
      if (reqId === requestRef.current) {
        setError(err.message || "Unable to load comments. Please try again.");
      }
    } finally {
      if (reqId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, postId, isInitialLoadComplete]);

  const loadMoreComments = useCallback(async () => {
    if (isLoading || !hasMore || comments.length === 0) return;

    const reqId = ++requestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const lastComment = comments[comments.length - 1];
      const data = await getWhisperComments(
        supabase,
        postId,
        lastComment.created_at || undefined,
        lastComment.id || undefined
      );

      if (reqId === requestRef.current) {
        setComments((prev) => {
          // Prevent duplicates by checking ids
          const existingIds = new Set(prev.map((c) => c.id));
          const newComments = data.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newComments];
        });
        setHasMore(data.length === WHISPER_CONSTANTS.COMMENT_PAGE_SIZE);
      }
    } catch (err: any) {
      if (reqId === requestRef.current) {
        setError(err.message || "Unable to load comments. Please try again.");
      }
    } finally {
      if (reqId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, postId, comments, isLoading, hasMore]);

  return {
    comments,
    isLoading,
    error,
    hasMore,
    loadComments,
    loadMoreComments,
    isInitialLoadComplete,
  };
}
