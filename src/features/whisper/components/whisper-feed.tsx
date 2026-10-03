"use client";

import { useWhisperFeed } from "@/features/whisper/hooks/use-whisper-feed";
import { WhisperComposer } from "@/features/whisper/components/whisper-composer";
import { WhisperPostCard } from "@/features/whisper/components/whisper-post-card";
import { Button } from "@/components/ui/button";

export function WhisperFeed() {
  const {
    feedType,
    handleTabChange,

    latestPosts,
    isLatestLoading,
    isLatestLoadingMore,
    latestHasMore,
    latestError,

    trendingPosts,
    isTrendingLoading,
    isTrendingLoadingMore,
    trendingHasMore,
    trendingError,

    interactionError,
    handleToggleLike,
    handleDeletePost,

    handleLoadMore,
    prependNewPost,
    refreshLatest,
  } = useWhisperFeed();

  const isLatest = feedType === "latest";
  const posts = isLatest ? latestPosts : trendingPosts;
  const isLoading = isLatest ? isLatestLoading : isTrendingLoading;
  const isLoadingMore = isLatest ? isLatestLoadingMore : isTrendingLoadingMore;
  const hasMore = isLatest ? latestHasMore : trendingHasMore;
  const error = isLatest ? latestError : trendingError;

  return (
    <div className="max-w-2xl mx-auto">
      <WhisperComposer
        onPostCreated={(post) => {
          prependNewPost(post);
        }}
      />

      <div className="flex border-b border-slate-800 mb-3">
        <button
          type="button"
          onClick={() => handleTabChange("latest")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            isLatest
              ? "text-primary border-b-2 border-primary"
              : "text-slate-400 hover:text-slate-300"
          }`}
          aria-selected={isLatest}
          role="tab"
        >
          Latest
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("trending")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            !isLatest
              ? "text-primary border-b-2 border-primary"
              : "text-slate-400 hover:text-slate-300"
          }`}
          aria-selected={!isLatest}
          role="tab"
        >
          Trending
        </button>
      </div>

      {/* Interaction error banner */}
      {interactionError && (
        <div
          className="mb-3 px-4 py-2.5 rounded-md bg-red-950/50 border border-red-800/50 text-red-300 text-sm"
          role="alert"
          aria-live="assertive"
        >
          {interactionError}
        </div>
      )}

      <div className="space-y-2">
        {isLoading && posts.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            Loading whispers…
          </div>
        ) : error && posts.length === 0 ? (
          <div className="py-8 text-center text-red-400">
            {error}
            <button
              className="ml-4 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors"
              onClick={() => (isLatest ? refreshLatest() : handleLoadMore())}
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 bg-surface-100/40 rounded-lg border border-white/5">
            {isLatest
              ? "No whispers yet. Be the first to share!"
              : "No trending whispers this week."}
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <WhisperPostCard
                key={post.id}
                post={post}
                onToggleLike={handleToggleLike}
                onDelete={handleDeletePost}
              />
            ))}

            {hasMore && (
              <div className="pt-1 pb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full rounded-md border border-white/5 bg-surface-100/30 px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-surface-100 disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="py-4 text-center text-xs text-slate-600">
                You&apos;ve reached the end of the feed.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
