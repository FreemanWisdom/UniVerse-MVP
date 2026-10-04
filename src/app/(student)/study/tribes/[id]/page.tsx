"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  acceptTribeJoinRequest,
  cancelTribeJoinRequest,
  countTribeMembers,
  createTribePost,
  declineTribeJoinRequest,
  deleteTribePost,
  getTribe,
  leaveTribe,
  listMyJoinRequestTribeIds,
  listMyTribeIds,
  listMyTribePostIds,
  listTribeJoinRequests,
  listTribePosts,
  requestTribeJoin,
} from "@/services/study/tribes.service";
import { Tribe, TribeJoinRequest, TribePost } from "@/features/study/tribes.types";
import { STUDY_CONSTANTS } from "@/features/study/study.constants";
import { BackButton } from "@/components/back-button";
import { IconSend } from "@/components/icons";
import { StudyMeta, StudyNotice, StudySkeletonRows } from "@/features/study/components/study-ui";

function displayTribeName(name: string): string {
  return name
    .split(/(\s+)/)
    .map((part) => (/^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
}

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
  const [isPending, setIsPending] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [joinRequests, setJoinRequests] = useState<TribeJoinRequest[]>([]);
  const [requestActionBusyId, setRequestActionBusyId] = useState<string | null>(null);

  // Initial load: tribe, membership, member count, and posts (members only).
  useEffect(() => {
    if (!tribeId) return;

    let cancelled = false;

    const load = async () => {
      const supabase = createClient();

      try {
        setLoading(true);
        setError(null);

        const [nextTribe, myTribeIds, myPending, requestsResult] = await Promise.all([
          getTribe(supabase, tribeId),
          listMyTribeIds(supabase)
            .then((ids) => ids.includes(tribeId))
            .catch(() => false),
          listMyJoinRequestTribeIds(supabase)
            .then((ids) => ids.includes(tribeId))
            .catch(() => false),
          listTribeJoinRequests(supabase, tribeId).catch(() => null),
        ]);

        if (cancelled) return;

        if (!nextTribe) {
          setTribeMissing(true);
          return;
        }

        setTribe(nextTribe);
        const member = myTribeIds;
        setIsMember(member);
        setIsPending(!member && myPending);
        setIsCreator(Boolean(requestsResult?.is_creator));
        setJoinRequests(requestsResult?.requests ?? []);

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
      } else if (isPending) {
        await cancelTribeJoinRequest(supabase, tribe.id);
        setIsPending(false);
      } else {
        await requestTribeJoin(supabase, tribe.id);
        setIsPending(true);
      }

      void countTribeMembers(supabase, tribe.id)
        .then((count) => setMemberCount(count))
        .catch(() => setMemberCount(null));
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : "";
      setError(
        message === "session_expired"
          ? "Your session expired. Please sign in again."
          : isMember
            ? "We couldn't remove you from this tribe. Please try again."
            : "We couldn't send your join request. Please try again."
      );
    } finally {
      setMembershipBusy(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!tribe) return;

    const supabase = createClient();
    setRequestActionBusyId(requestId);

    try {
      await acceptTribeJoinRequest(supabase, requestId);
      setJoinRequests((current) => current.filter((request) => request.id !== requestId));
      void countTribeMembers(supabase, tribe.id)
        .then((count) => setMemberCount(count))
        .catch(() => setMemberCount(null));
    } catch (acceptError) {
      setError(
        acceptError instanceof Error && acceptError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : "We couldn't accept this request. Please try again."
      );
    } finally {
      setRequestActionBusyId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!tribe) return;

    const supabase = createClient();
    setRequestActionBusyId(requestId);

    try {
      await declineTribeJoinRequest(supabase, requestId);
      setJoinRequests((current) => current.filter((request) => request.id !== requestId));
    } catch (declineError) {
      setError(
        declineError instanceof Error && declineError.message === "session_expired"
          ? "Your session expired. Please sign in again."
          : "We couldn't decline this request. Please try again."
      );
    } finally {
      setRequestActionBusyId(null);
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
      <div className="space-y-4">
        <StudySkeletonRows count={2} />
      </div>
    );
  }

  if (tribeMissing) {
    return (
      <div className="space-y-4">
        <BackButton href="/study/tribes" label="All tribes" />
        <StudyNotice>
          This tribe doesn&#39;t exist or isn&#39;t available at your campus.
        </StudyNotice>
      </div>
    );
  }

  if (error && !tribe) {
    return (
      <div className="space-y-4">
        <BackButton href="/study/tribes" label="All tribes" />
        <StudyNotice tone="danger" role="alert">{error}</StudyNotice>
      </div>
    );
  }

  if (!tribe) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-surface-200 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <BackButton href="/study/tribes" label="Back to all tribes" className="shrink-0" />
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-campus-500/30 bg-campus-500/10 text-base font-bold text-campus-300"
          >
            {displayTribeName(tribe.name).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight tracking-tight text-foreground">
              {displayTribeName(tribe.name)}
            </h1>
            <p className="truncate text-xs text-slate-500">
              {memberCount === null ? "—" : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
              {tribe.course_code ? ` · ${tribe.course_code}` : ""} · group conversation
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isMember || isPending ? "outline" : "default"}
          onClick={() => void handleToggleMembership()}
          disabled={membershipBusy}
          aria-pressed={isMember || isPending}
          title={isPending ? "Waiting for the creator's approval — tap to cancel" : undefined}
        >
          {membershipBusy ? "…" : isMember ? "Leave" : isPending ? "Requested" : "Request to join"}
        </Button>
      </div>

      <div className="space-y-1">
        {tribe.description ? (
          <p className="text-sm leading-relaxed text-slate-300">{tribe.description}</p>
        ) : null}
        <StudyMeta
          items={[tribe.category, tribe.department, tribe.level]}
        />
      </div>

      {isMember ? (
        <div className="rounded-2xl border border-surface-300 bg-surface-50 p-2 focus-within:border-campus-500/50 focus-within:ring-1 focus-within:ring-campus-500/40">
          <textarea
            aria-label="Message your tribe"
            value={postInput}
            maxLength={STUDY_CONSTANTS.TRIBE_POST_MAX_LENGTH}
            onChange={(event) => setPostInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (postInput.trim().length > 0 && !posting) void handleCreatePost();
              }
            }}
            placeholder={`Message ${displayTribeName(tribe.name)}…`}
            rows={2}
            className="w-full resize-none rounded-lg bg-transparent p-2 text-sm leading-relaxed text-foreground placeholder:text-slate-500 focus-visible:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            {postError ? (
              <p className="min-w-0 flex-1 text-xs text-red-400" role="alert">{postError}</p>
            ) : (
              <p className="hidden text-[11px] text-slate-500 sm:block">Enter to send · Shift+Enter for a new line</p>
            )}
            <Button
              type="button"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => void handleCreatePost()}
              disabled={posting || postInput.trim().length === 0}
              aria-label="Send message to tribe"
            >
              <IconSend size={14} />
              {posting ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      ) : (
        <StudyNotice>
          {isPending
            ? "Your request is waiting for the creator's approval. Tap Requested to cancel."
            : "Request to join — the creator approves members before you can see and write posts."}
        </StudyNotice>
      )}

      {isCreator && joinRequests.length > 0 ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50/50 p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Join requests ({joinRequests.length})
          </h2>
          <ul className="mt-2 space-y-2">
            {joinRequests.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-2 rounded-md border border-surface-200 bg-surface-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {request.full_name?.trim() || "Unnamed student"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Requested {formatDateTime(request.requested_at)}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleAcceptRequest(request.id)}
                    disabled={requestActionBusyId === request.id}
                  >
                    {requestActionBusyId === request.id ? "…" : "Accept"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDeclineRequest(request.id)}
                    disabled={requestActionBusyId === request.id}
                  >
                    Decline
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isMember ? (
        postsLoading ? (
          <p className="text-sm text-slate-400" aria-live="polite">Loading posts…</p>
        ) : posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No messages yet. Start the conversation.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {posts.map((post) => {
                const isMine = myPostIds.includes(post.id);
                return (
                  <div
                    key={post.id}
                    className={isMine ? "flex flex-col items-end" : "flex flex-col items-start"}
                  >
                    <div
                      className={
                        isMine
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-campus-500/15 px-3.5 py-2.5"
                          : "max-w-[85%] rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-3.5 py-2.5"
                      }
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{post.content}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 px-1">
                      <span className="text-[11px] text-slate-500">{formatDateTime(post.created_at)}</span>
                      {isMine ? (
                          deleteConfirmId === post.id ? (
                            <span className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-full px-2.5 text-[11px]"
                                onClick={() => void handleDeletePost(post.id)}
                                disabled={deletingId === post.id}
                              >
                                {deletingId === post.id ? "Deleting…" : "Confirm delete"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-full px-2.5 text-[11px]"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 rounded-full px-2.5 text-[11px] text-slate-500 hover:text-foreground"
                              onClick={() => setDeleteConfirmId(post.id)}
                              aria-label="Delete your message"
                            >
                              Delete
                            </Button>
                          )
                        ) : null}
                    </div>
                  </div>
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
