"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadOrbitFeed, loadOrbitPost, subscribeToOrbit } from "@/services/orbit";
import type { OrbitFeedMode, OrbitPost } from "../orbit.types";
import { rankTrending, searchPosts } from "../orbit.utils";
import { OrbitComposer } from "./orbit-composer";
import { OrbitPostCard } from "./orbit-post-card";
import { OrbitComments } from "./orbit-comments";
import { OrbitEmpty, OrbitError } from "./orbit-states";

export function OrbitPage({ userId, university }: { userId: string; university: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<OrbitPost[]>([]);
  const [cursor, setCursor] = useState<Awaited<ReturnType<typeof loadOrbitFeed>>["nextCursor"]>(null);
  const [mode, setMode] = useState<OrbitFeedMode>("for-you");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [newPosts, setNewPosts] = useState(0);
  // ?post=<id> deep link (used by shared-post chat messages)
  const [deepLinkId, setDeepLinkId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("post")
  );
  const [deepPost, setDeepPost] = useState<OrbitPost | null>(null);
  const [deepMissing, setDeepMissing] = useState(false);
  const requestGeneration = useRef(0);
  const activeRequest = useRef<number | null>(null);
  const mounted = useRef(true);
  const seenRealtimeEvents = useRef(new Set<string>());
  const commentSections = useRef(new Map<string, HTMLDivElement>());

  const load = useCallback(async (append = false) => {
    if (append && (loadingMore || !cursor)) return;

    const generation = ++requestGeneration.current;
    activeRequest.current = generation;
    const requestCursor = append ? cursor ?? undefined : undefined;

    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");

    try {
      const result = await loadOrbitFeed(supabase, userId, university, requestCursor);
      if (!mounted.current || activeRequest.current !== generation) return;

      setPosts((current) => append
        ? [...current, ...result.posts.filter((post) => !current.some((item) => item.id === post.id))]
        : result.posts);
      setCursor(result.nextCursor);
    } catch (e) {
      if (mounted.current && activeRequest.current === generation) {
        setError(e instanceof Error ? e.message : "We couldn't load the Orbit feed.");
      }
    } finally {
      if (mounted.current && activeRequest.current === generation) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [cursor, loadingMore, supabase, university, userId]);

  useEffect(() => {
    mounted.current = true;
    const initialLoad = window.setTimeout(() => { void load(); }, 0);
    return () => {
      window.clearTimeout(initialLoad);
      mounted.current = false;
      activeRequest.current = null;
    };
  }, [load]);

  useEffect(() => {
    const subscription = subscribeToOrbit(supabase, (event) => {
      if (!mounted.current || event.table !== "orbit_feed") return;

      const row = event.eventType === "DELETE" ? event.old : event.new;
      const id = String(row.id ?? "");
      const eventKey = `${event.eventType}:${id}:${String(row.created_at ?? row.updated_at ?? "")}`;
      if (!id || seenRealtimeEvents.current.has(eventKey)) return;
      seenRealtimeEvents.current.add(eventKey);
      if (seenRealtimeEvents.current.size > 1000) {
        const oldest = seenRealtimeEvents.current.values().next().value;
        if (oldest) seenRealtimeEvents.current.delete(oldest);
      }

      if (event.eventType !== "DELETE" && (
        row.school_tag !== university ||
        row.status !== "active" ||
        row.visibility !== "campus"
      )) return;

      if (event.eventType === "INSERT") {
        setNewPosts((count) => count + 1);
      } else if (event.eventType === "UPDATE") {
        setPosts((current) => row.status === "deleted"
          ? current.filter((post) => post.id !== id)
          : current.map((post) => post.id === id ? { ...post, ...row } as OrbitPost : post));
      } else if (event.eventType === "DELETE") {
        setPosts((current) => current.filter((post) => post.id !== id));
      }
    });

    return () => {
      void subscription.unsubscribe();
    };
  }, [supabase, university]);

  // For You keeps the exact order returned by the database — created_at
  // descending (newest first). It is NEVER re-sorted client-side; pagination
  // appends strictly older posts so the ordering holds as you load more.
  // Only Trending re-ranks, by measured engagement (likes + comments + shares).
  // Resolve the deep link against the loaded feed; if the post is older than
  // the loaded pages, fetch that single post (RLS-scoped) and pin it above
  // the feed instead of breaking the newest-first ordering.
  useEffect(() => {
    if (!deepLinkId || loading || deepPost || deepMissing) return;
    if (posts.some((post) => post.id === deepLinkId)) {
      const element = document.getElementById(`orbit-post-${deepLinkId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    void loadOrbitPost(supabase, userId, deepLinkId).then((found) => {
      if (mounted.current) {
        if (found) setDeepPost(found);
        else setDeepMissing(true);
      }
    });
  }, [deepLinkId, deepMissing, deepPost, loading, posts, supabase, userId]);

  const visible = useMemo(() => {
    const searched = searchPosts(posts, search);
    return mode === "trending" ? rankTrending(searched) : searched;
  }, [mode, posts, search]);

  async function refresh() {
    setNewPosts(0);
    setCursor(null);
    await load(false);
  }

  function updatePost(next: OrbitPost) {
    setPosts((current) => next.status === "deleted"
      ? current.filter((item) => item.id !== next.id)
      : current.map((item) => item.id === next.id ? next : item));
  }

  function openComments(postId: string) {
    const section = commentSections.current.get(postId);
    if (!section) return;
    section.querySelector<HTMLButtonElement>("button[aria-expanded]")?.click();
    window.requestAnimationFrame(() => section.querySelector<HTMLInputElement>("input[aria-label='Write a comment']")?.focus());
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <header>
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          The Orbit
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
          What’s happening on campus?
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {university || "Your campus"} · a verified student space
        </p>
      </header>
      
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search loaded posts…"
        aria-label="Search loaded Orbit posts"
        className="w-full rounded-md border border-white/10 bg-surface-100/40 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-campus-500 transition-colors"
      />
      
      <OrbitComposer userId={userId} university={university} onCreated={refresh} />
      
      <div className="flex gap-2 border-b border-white/10" role="tablist">
        {(["for-you", "trending"] as const).map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={mode === item}
            onClick={() => setMode(item)}
            className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${
              mode === item
                ? "border-b-2 border-campus-500 text-campus-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {item === "for-you" ? "For You" : "Trending"}
          </button>
        ))}
      </div>

      {newPosts > 0 && (
        <button
          onClick={() => void refresh()}
          className="w-full rounded-md border border-campus-500/30 bg-campus-500/10 px-3 py-2 text-xs font-medium text-campus-300 transition-colors hover:bg-campus-500/20"
        >
          {newPosts} new post{newPosts === 1 ? "" : "s"} available · refresh
        </button>
      )}

      {deepMissing ? (
        <p className="rounded-md border border-white/10 bg-surface-100/40 px-3 py-2 text-xs text-slate-400">
          This shared post is no longer available.
        </p>
      ) : null}

      {deepPost ? (
        <div className="rounded-lg ring-2 ring-campus-500/70" id={`orbit-post-${deepPost.id}`}>
          <OrbitPostCard
            post={deepPost}
            userId={userId}
            onChangeAction={(next) => setDeepPost(next)}
            onCommentAction={() => setDeepPost((current) => current)}
          />
          <div>
            <OrbitComments postId={deepPost.id} userId={userId} count={deepPost.comment_count} />
          </div>
          <button
            type="button"
            onClick={() => { setDeepPost(null); setDeepLinkId(null); }}
            className="mt-1 w-full rounded-md border border-white/5 px-3 py-1.5 text-[11px] text-slate-500 hover:bg-white/5"
          >
            Show all posts
          </button>
        </div>
      ) : null}

      {error ? (
        <OrbitError message={error} retry={() => void load(false)} />
      ) : loading ? (
        <div role="status" className="space-y-3">
          <div className="h-32 animate-pulse rounded-lg bg-surface-100/50" />
          <div className="h-32 animate-pulse rounded-lg bg-surface-100/50" />
        </div>
      ) : visible.length === 0 ? (
        <OrbitEmpty />
      ) : (
        <div className="space-y-3 pb-8">
          {visible.map(
            (post) =>
              post.status !== "deleted" && (
                <div key={post.id} id={`orbit-post-${post.id}`} className={`group rounded-lg ${deepLinkId === post.id ? "ring-2 ring-campus-500/70" : ""}`}>
                  <OrbitPostCard
                    post={post}
                    userId={userId}
                    onChangeAction={updatePost}
                    onCommentAction={() => openComments(post.id)}
                  />
                  <div
                    ref={(element) => {
                      if (element) commentSections.current.set(post.id, element);
                      else commentSections.current.delete(post.id);
                    }}
                  >
                    <OrbitComments postId={post.id} userId={userId} count={post.comment_count} />
                  </div>
                </div>
              )
          )}
          <button
            disabled={!cursor || loadingMore}
            onClick={() => void load(true)}
            className="w-full rounded-md border border-white/5 bg-surface-100/30 px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-surface-100 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : cursor ? "Load more" : "You’re caught up"}
          </button>
        </div>
      )}
    </div>
  );
}
