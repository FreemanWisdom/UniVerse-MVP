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

      <div className="flex border-b border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => handleTabChange("latest")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
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
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
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
          className="mb-4 px-4 py-3 rounded-md bg-red-950/50 border border-red-800/50 text-red-300 text-sm"
          role="alert"
          aria-live="assertive"
        >
          {interactionError}
        </div>
      )}

      <div className="space-y-4">
        {isLoading && posts.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            Loading whispers…
          </div>
        ) : error && posts.length === 0 ? (
          <div className="py-8 text-center text-red-400">
            {error}
            <Button
              variant="outline"
              className="ml-4"
              onClick={() => (isLatest ? refreshLatest() : handleLoadMore())}
            >
              Retry
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
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
              <div className="pt-4 pb-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Loading…" : "Load More"}
                </Button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="py-8 text-center text-xs text-slate-600">
                You&apos;ve reached the end of the feed.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
