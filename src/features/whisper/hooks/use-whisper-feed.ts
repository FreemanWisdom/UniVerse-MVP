import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { WhisperPostUI, WhisperState } from "@/features/whisper/whisper.types";
import { getLatestWhispers, getTrendingWhispers } from "@/services/whisper/feed.service";
import { WHISPER_CONSTANTS } from "@/features/whisper/whisper.constants";
import {
  getMyWhisperState,
  toggleWhisperLike,
  deleteWhisper,
} from "@/services/whisper/interaction.service";

export type FeedType = "latest" | "trending";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Merge a WhisperState[] into an existing WhisperPostUI[] by post_id. */
function mergeInteractionState(
  posts: WhisperPostUI[],
  states: WhisperState[]
): WhisperPostUI[] {
  if (states.length === 0) return posts;
  const map = new Map<string, WhisperState>(states.map((s) => [s.post_id, s]));
  return posts.map((post) => {
    const s = map.get(post.id);
    if (!s) return post;
    return { ...post, liked: s.liked, is_mine: s.is_mine };
  });
}

/** Apply a like / unlike optimistic update to a single post. */
function applyOptimisticLike(
  post: WhisperPostUI,
  isLiking: boolean
): WhisperPostUI {
  return {
    ...post,
    liked: isLiking,
    like_count: isLiking
      ? (post.like_count ?? 0) + 1
      : Math.max(0, (post.like_count ?? 0) - 1),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWhisperFeed() {
  const [feedType, setFeedType] = useState<FeedType>("latest");

  // State for Latest feed
  const [latestPosts, setLatestPosts] = useState<WhisperPostUI[]>([]);
  const [isLatestLoading, setIsLatestLoading] = useState(false);
  const [isLatestLoadingMore, setIsLatestLoadingMore] = useState(false);
  const [latestHasMore, setLatestHasMore] = useState(true);
  const [latestError, setLatestError] = useState<string | null>(null);

  // State for Trending feed
  const [trendingPosts, setTrendingPosts] = useState<WhisperPostUI[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [isTrendingLoadingMore, setIsTrendingLoadingMore] = useState(false);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  // Interaction errors shown to the user
  const [interactionError, setInteractionError] = useState<string | null>(null);

  // Tracks in-flight like mutations per post to prevent rapid double-clicks
  const likeInFlightRef = useRef<Set<string>>(new Set());

  // Feed-level request counters for stale-response protection
  const latestRequestRef = useRef<number>(0);
  const trendingRequestRef = useRef<number>(0);

  // Interaction state request counters — separate from feed counters
  const latestStateRequestRef = useRef<number>(0);
  const trendingStateRequestRef = useRef<number>(0);

  const supabase = createClient();

  // ---------------------------------------------------------------------------
  // Interaction state loading
  // ---------------------------------------------------------------------------

  /**
   * Fetch get_my_whisper_state for a list of post IDs and merge the result
   * into the appropriate feed's posts array.
   *
   * Non-fatal: if this fails, posts default to is_mine:false / liked:false.
   * The stale-check uses both the feed request ID and the state request ID
   * so that rapidly switching tabs or loading pages cannot cause old state
   * to overwrite newer state.
   */
  const fetchAndMergeState = useCallback(
    async (
      postIds: string[],
      target: "latest" | "trending",
      feedRequestId: number,
      feedRequestRef: React.MutableRefObject<number>,
      stateRequestRef: React.MutableRefObject<number>
    ) => {
      if (postIds.length === 0) return;

      const stateRequestId = ++stateRequestRef.current;

      try {
        const states: WhisperState[] = await getMyWhisperState(supabase, postIds);

        // Discard if either the feed or the state request is now stale
        if (
          feedRequestId !== feedRequestRef.current ||
          stateRequestId !== stateRequestRef.current
        ) {
          return;
        }

        const setter = target === "latest" ? setLatestPosts : setTrendingPosts;
        setter((prev) => mergeInteractionState(prev, states));
      } catch {
        // Non-fatal — interaction state is best-effort
      }
    },
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // Feed fetching
  // ---------------------------------------------------------------------------

  const fetchLatest = useCallback(
    async (isLoadMore = false) => {
      if (!isLoadMore) setIsLatestLoading(true);
      else setIsLatestLoadingMore(true);

      setLatestError(null);

      const requestId = ++latestRequestRef.current;

      try {
        const cursor =
          isLoadMore && latestPosts.length > 0
            ? latestPosts[latestPosts.length - 1].created_at || undefined
            : undefined;

        const newPosts = await getLatestWhispers(supabase, cursor);

        if (requestId !== latestRequestRef.current) return;

        if (isLoadMore) {
          setLatestPosts((prev) => [...prev, ...newPosts]);
        } else {
          setLatestPosts(newPosts);
        }

        setLatestHasMore(newPosts.length === WHISPER_CONSTANTS.FEED_PAGE_SIZE);

        if (newPosts.length > 0) {
          fetchAndMergeState(
            newPosts.map((p) => p.id),
            "latest",
            requestId,
            latestRequestRef,
            latestStateRequestRef
          );
        }
      } catch (err) {
        if (requestId === latestRequestRef.current) {
          setLatestError(
            err instanceof Error ? err.message : "An unknown error occurred."
          );
        }
      } finally {
        if (requestId === latestRequestRef.current) {
          setIsLatestLoading(false);
          setIsLatestLoadingMore(false);
        }
      }
    },
    [supabase, latestPosts, fetchAndMergeState]
  );

  const fetchTrending = useCallback(
    async (isLoadMore = false) => {
      if (!isLoadMore) setIsTrendingLoading(true);
      else setIsTrendingLoadingMore(true);

      setTrendingError(null);

      const requestId = ++trendingRequestRef.current;

      try {
        const offset = isLoadMore ? trendingPosts.length : 0;

        const newPosts = await getTrendingWhispers(supabase, offset);

        if (requestId !== trendingRequestRef.current) return;

        if (isLoadMore) {
          setTrendingPosts((prev) => [...prev, ...newPosts]);
        } else {
          setTrendingPosts(newPosts);
        }

        setTrendingHasMore(newPosts.length === WHISPER_CONSTANTS.FEED_PAGE_SIZE);

        if (newPosts.length > 0) {
          fetchAndMergeState(
            newPosts.map((p) => p.id),
            "trending",
            requestId,
            trendingRequestRef,
            trendingStateRequestRef
          );
        }
      } catch (err) {
        if (requestId === trendingRequestRef.current) {
          setTrendingError(
            err instanceof Error ? err.message : "An unknown error occurred."
          );
        }
      } finally {
        if (requestId === trendingRequestRef.current) {
          setIsTrendingLoading(false);
          setIsTrendingLoadingMore(false);
        }
      }
    },
    [supabase, trendingPosts, fetchAndMergeState]
  );

  // ---------------------------------------------------------------------------
  // Initial load on tab switch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (feedType === "latest" && latestPosts.length === 0 && !isLatestLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLatest();
    } else if (
      feedType === "trending" &&
      trendingPosts.length === 0 &&
      !isTrendingLoading
    ) {
      fetchTrending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType]);

  // ---------------------------------------------------------------------------
  // Tab + pagination
  // ---------------------------------------------------------------------------

  const handleTabChange = (type: FeedType) => {
    setFeedType(type);
  };

  const handleLoadMore = () => {
    if (feedType === "latest" && !isLatestLoadingMore && latestHasMore) {
      fetchLatest(true);
    } else if (
      feedType === "trending" &&
      !isTrendingLoadingMore &&
      trendingHasMore
    ) {
      fetchTrending(true);
    }
  };

  const prependNewPost = useCallback((post: WhisperPostUI) => {
    // The create_whisper RPC returns only {id, anon_label, content, like_count,
    // created_at} — no is_mine/liked. The author of a just-created post is by
    // definition the owner and has not liked it yet, so enrich client-side.
    // (Otherwise the Delete action stays hidden until the next feed reload.)
    setLatestPosts((prev) => [
      { ...post, is_mine: true, liked: post.liked ?? false },
      ...prev,
    ]);
    // Trending is rank-ordered; new posts are not prepended there.
  }, []);

  // ---------------------------------------------------------------------------
  // Like / unlike
  // ---------------------------------------------------------------------------

  /**
   * Optimistically toggle the like state for a post in both feeds.
   *
   * Race protection:
   * - A per-post in-flight Set prevents concurrent mutations from the same client.
   *   If a mutation is already running for this postId, the call is a no-op.
   *
   * toggle_whisper_like RPC return shape:
   * - The service returns `any` (null/void on the live backend).
   * - We do NOT read authoritative state from the response because none is returned.
   * - The optimistic state is preserved on success.
   * - On failure, both feeds are rolled back to their pre-mutation snapshots.
   *
   * Trending consistency:
   * - The optimistic like_count update is applied to the Trending feed in-place.
   * - The Trending ordering is NOT recalculated locally — that would require a
   *   full re-sort and could cause jarring layout shifts.
   * - The visible post count reflects the mutation immediately; ordering is
   *   reconciled the next time the user loads or refreshes the Trending feed.
   */
  const handleToggleLike = useCallback(
    async (postId: string) => {
      // Prevent race from rapid clicks
      if (likeInFlightRef.current.has(postId)) return;
      likeInFlightRef.current.add(postId);
      setInteractionError(null);

      // Capture snapshots for rollback
      let prevLatest: WhisperPostUI | undefined;
      let prevTrending: WhisperPostUI | undefined;
      let isLiking = false;

      // Apply optimistic update to Latest
      setLatestPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === postId);
        if (idx === -1) return prev;
        prevLatest = prev[idx];
        isLiking = !prevLatest.liked;
        const updated = [...prev];
        updated[idx] = applyOptimisticLike(prevLatest, isLiking);
        return updated;
      });

      // Apply optimistic update to Trending (same post, same direction)
      setTrendingPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === postId);
        if (idx === -1) return prev;
        prevTrending = prev[idx];
        const liking = !prevTrending.liked;
        const updated = [...prev];
        updated[idx] = applyOptimisticLike(prevTrending, liking);
        return updated;
      });

      try {
        await toggleWhisperLike(supabase, postId);
        // No authoritative response data — optimistic state stands.
      } catch {
        // Rollback Latest
        setLatestPosts((prev) => {
          if (!prevLatest) return prev;
          const idx = prev.findIndex((p) => p.id === postId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = prevLatest;
          return updated;
        });
        // Rollback Trending
        setTrendingPosts((prev) => {
          if (!prevTrending) return prev;
          const idx = prev.findIndex((p) => p.id === postId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = prevTrending;
          return updated;
        });
        setInteractionError("Unable to update this reaction. Please try again.");
      } finally {
        likeInFlightRef.current.delete(postId);
      }
    },
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  /**
   * Delete the authenticated user's own Whisper post.
   *
   * - The confirmation step is handled by the caller (WhisperPostCard).
   * - delete_whisper RPC returns boolean:
   *     true  = deleted successfully
   *     false = backend refused (not owner, not found)
   * - On success: post is filtered out of both feeds.
   * - On failure: post remains visible; interactionError is set.
   */
  const handleDeletePost = useCallback(
    async (postId: string) => {
      setInteractionError(null);

      try {
        const success = await deleteWhisper(supabase, postId);

        if (!success) {
          setInteractionError("Unable to delete this Whisper. Please try again.");
          return;
        }

        setLatestPosts((prev) => prev.filter((p) => p.id !== postId));
        setTrendingPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch {
        setInteractionError("Unable to delete this Whisper. Please try again.");
      }
    },
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    feedType,
    handleTabChange,

    // Latest state
    latestPosts,
    isLatestLoading,
    isLatestLoadingMore,
    latestHasMore,
    latestError,

    // Trending state
    trendingPosts,
    isTrendingLoading,
    isTrendingLoadingMore,
    trendingHasMore,
    trendingError,

    // Interaction
    interactionError,
    handleToggleLike,
    handleDeletePost,

    // Feed actions
    handleLoadMore,
    prependNewPost,
    refreshLatest: () => fetchLatest(false),
  };
}
