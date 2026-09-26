"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  countTribeMembers,
  createTribePost,
  deleteTribePost,
  getTribe,
  joinTribe,
  leaveTribe,
  listMyTribeIds,
  listMyTribePostIds,
  listTribePosts,
} from "@/services/study/tribes.service";
import { Tribe, TribePost } from "@/features/study/tribes.types";
import { STUDY_CONSTANTS } from "@/features/study/study.constants";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TribeDetailPage() {
  const params = useParams<{ id: string }>();
  const tribeId = typeof params.id === "string" ? params.id : "";

  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [tribeMissing, setTribeMissing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [posts, setPosts] = useState<TribePost[]>([]);
  const [myPostIds, setMyPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postInput, setPostInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [membershipBusy, setMembershipBusy] = useState(false);

  // Initial load: tribe, membership, member count, and posts (members only).
  useEffect(() => {
    if (!tribeId) return;

    let cancelled = false;

    const load = async () => {
      const supabase = createClient();

      try {
        setLoading(true);
        setError(null);

        const [nextTribe, myTribeIds] = await Promise.all([
          getTribe(supabase, tribeId),
          listMyTribeIds(supabase)
            .then((ids) => ids.includes(tribeId))
            .catch(() => false),
        ]);

        if (cancelled) return;

        if (!nextTribe) {
          setTribeMissing(true);
          return;
        }

        setTribe(nextTribe);
        const member = myTribeIds;
        setIsMember(member);

        void countTribeMembers(supabase, tribeId)
          .then((count) => {
            if (!cancelled) setMemberCount(count);
          })
          .catch(() => {
            if (!cancelled) setMemberCount(null);
          });

        if (member) {
          const [nextPosts, nextMyPostIds] = await Promise.all([
            listTribePosts(supabase, tribeId),
            listMyTribePostIds(supabase, tribeId).catch(() => [] as string[]),
          ]);

          if (cancelled) return;

          setPosts(nextPosts);
          setMyPostIds(nextMyPostIds);
          setHasMore(nextPosts.length === STUDY_CONSTANTS.TRIBE_POST_PAGE_SIZE);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load this tribe.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [tribeId]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    const last = posts[posts.length - 1];
    if (!last) return;

    setLoadingMore(true);
    const supabase = createClient();

    try {
      const more = await listTribePosts(supabase, tribeId, {
        cursor: { created_at: last.created_at, id: last.id },
      });

      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...more.filter((post) => !seen.has(post.id))];
      });
      setHasMore(more.length === STUDY_CONSTANTS.TRIBE_POST_PAGE_SIZE);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleMembership = async () => {
    if (!tribe) return;

    const supabase = createClient();
    setMembershipBusy(true);
    setError(null);

    try {
      if (isMember) {
        await leaveTribe(supabase, tribe.id);
        setIsMember(false);
      } else {
        await joinTribe(supabase, tribe.id);
        setIsMember(true);

        // Newly a member: load posts now.
        setPostsLoading(true);
        try {
          const [nextPosts, nextMyPostIds] = await Promise.all([
            listTribePosts(supabase, tribe.id),
            listMyTribePostIds(supabase, tribe.id).catch(() => [] as string[]),
          ]);
          setPosts(nextPosts);
          setMyPostIds(nextMyPostIds);
          setHasMore(nextPosts.length === STUDY_CONSTANTS.TRIBE_POST_PAGE_SIZE);
        } finally {
          setPostsLoading(false);
        }
      }

      void countTribeMembers(supabase, tribe.id)
        .then((count) => setMemberCount(count))
        .catch(() => setMemberCount(null));
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : "";
      setError(
        message === "session_expired"
          ? "Your session expired. Please sign in again."
          : `We couldn't ${isMember ? "remove you from" : "add you to"} this tribe. Please try again.`
      );
    } finally {
      setMembershipBusy(false);
    }
  };

  const handleCreatePost = async () => {
    if (!tribe) return;

    const supabase = createClient();
    setPosting(true);
    setPostError(null);

    try {
      const post = await createTribePost(supabase, tribe.id, postInput);
      setPosts((current) => {
        const seen = new Set(current.map((item) => item.id));
        return seen.has(post.id) ? current : [...current, post];
      });
      setMyPostIds((current) => (current.includes(post.id) ? current : [...current, post.id]));
      setPostInput("");
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "";
      setPostError(
        message === "invalid_content"
          ? "Write something first (2,000 characters max)."
          : message === "posting_not_allowed"
            ? "Posting is temporarily unavailable for your account."
            : message === "session_expired"
              ? "Your session expired. Please sign in again."
              : "We couldn't post your message. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const supabase = createClient();
    setDeletingId(postId);

    try {
      await deleteTribePost(supabase, postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
      setMyPostIds((current) => current.filter((id) => id !== postId));
    } catch (deleteError) {
      setPostError(
        deleteError instanceof Error && deleteError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : "We couldn't delete this post. Please try again."
      );
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card aria-busy="true" aria-label="Loading tribe">
          <CardContent className="p-6 text-sm text-slate-400">Loading tribe…</CardContent>
        </Card>
      </div>
    );
  }

  if (tribeMissing) {
    return (
      <div className="space-y-6">
        <Link href="/study/tribes" className="text-sm text-slate-400 hover:text-foreground">
          ← Study Tribes
        </Link>
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">
            This tribe doesn&#39;t exist or isn&#39;t available at your campus.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !tribe) {
    return (
      <div className="space-y-6">
        <Link href="/study/tribes" className="text-sm text-slate-400 hover:text-foreground">
          ← Study Tribes
        </Link>
        <Card>
          <CardContent className="p-6 text-sm text-red-400" role="alert">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!tribe) return null;

  return (
    <div className="space-y-6">
      <Link href="/study/tribes" className="text-sm text-slate-400 hover:text-foreground">
        ← Study Tribes
      </Link>

      <Card>
        <CardContent className="space-y-2 p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{tribe.name}</h1>
            <Button
              type="button"
              size="sm"
              variant={isMember ? "outline" : "default"}
              onClick={() => void handleToggleMembership()}
              disabled={membershipBusy}
              aria-pressed={isMember}
            >
              {membershipBusy ? "…" : isMember ? "Leave" : "Join"}
            </Button>
          </div>

          {tribe.description ? (
            <p className="text-sm text-slate-300">{tribe.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
            {tribe.course_code ? <span>{tribe.course_code}</span> : null}
            {tribe.category ? <span>· {tribe.category}</span> : null}
            {tribe.department ? <span>· {tribe.department}</span> : null}
            {tribe.level ? <span>· {tribe.level}</span> : null}
            <span>· {memberCount === null ? "—" : `${memberCount} member${memberCount === 1 ? "" : "s"}`}</span>
          </div>
        </CardContent>
      </Card>

      {isMember ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <textarea
              aria-label="Write a tribe post"
              value={postInput}
              maxLength={STUDY_CONSTANTS.TRIBE_POST_MAX_LENGTH}
              onChange={(event) => setPostInput(event.target.value)}
              placeholder="Share something with your tribe…"
              rows={3}
              className="w-full rounded-lg border border-surface-300 bg-surface-50 p-3 text-sm text-foreground"
            />
            {postError ? (
              <p className="text-sm text-red-400" role="alert">{postError}</p>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => void handleCreatePost()}
              disabled={posting || postInput.trim().length === 0}
            >
              {posting ? "Posting…" : "Post"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">
            Join this tribe to see and write its posts.
          </CardContent>
        </Card>
      )}

      {isMember ? (
        postsLoading ? (
          <p className="text-sm text-slate-400" aria-live="polite">Loading posts…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-400">No posts yet. Start the conversation.</p>
        ) : (
          <>
            <div className="space-y-3">
              {posts.map((post) => {
                const isMine = myPostIds.includes(post.id);
                return (
                  <Card key={post.id}>
                    <CardContent className="space-y-2 p-4">
                      <p className="text-sm text-slate-200">{post.content}</p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500">{formatDateTime(post.created_at)}</span>
                        {isMine ? (
                          deleteConfirmId === post.id ? (
                            <span className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDeletePost(post.id)}
                                disabled={deletingId === post.id}
                              >
                                {deletingId === post.id ? "Deleting…" : "Confirm delete"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirmId(post.id)}
                            >
                              Delete
                            </Button>
                          )
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {hasMore ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more posts"}
              </Button>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}
