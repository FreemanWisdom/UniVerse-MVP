"use client";
import { useState } from "react";
import type { OrbitPost } from "../orbit.types";
import { displayName, formatOrbitTime, initials } from "../orbit.utils";
import { createClient } from "@/lib/supabase/client";
import { deleteOrbitPost, reportOrbitPost, toggleOrbitLike, toggleOrbitSave } from "@/services/orbit";
import { validateReportReason } from "../orbit.validation";

export function OrbitPostCard({
  post,
  userId,
  onChangeAction,
  onCommentAction,
}: {
  post: OrbitPost;
  userId: string;
  onChangeAction: (post: OrbitPost) => void;
  onCommentAction: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const name = displayName(post.author, post.poster_name ?? undefined);
  const supabase = createClient();

  async function action(kind: "like" | "save") {
    if (busy) return;
    setBusy(true);
    const next = kind === "like" ? !post.liked : !post.saved;
    onChangeAction({
      ...post,
      ...(kind === "like" ? { liked: next, like_count: post.like_count + (next ? 1 : -1) } : { saved: next }),
    });
    try {
      if (kind === "like") await toggleOrbitLike(supabase, post.id, userId, post.liked);
      else await toggleOrbitSave(supabase, post.id, userId, post.saved);
    } catch {
      onChangeAction(post);
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    const reason = window
      .prompt(
        "Why are you reporting this post? Use: spam, harassment, inappropriate, misinformation, or other.",
        "other"
      )
      ?.trim()
      .toLowerCase() ?? "";
    const validation = validateReportReason(reason);
    if (validation) {
      if (reason) window.alert(validation);
      return;
    }
    try {
      await reportOrbitPost(supabase, post.id, reason);
      window.alert("Report submitted.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Report failed.");
    }
  }

  async function remove() {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteOrbitPost(supabase, post.id);
      onChangeAction({ ...post, status: "deleted" });
    } catch {
      window.alert("We couldn't delete that post.");
    }
  }

  return (
    <article className="rounded-lg border border-white/5 bg-surface-100/40 p-3 sm:p-4">
      {/* HEADER */}
      <header className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-campus-500/20 font-semibold text-campus-300">
          {post.author?.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={`${name} profile`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xs">{initials(name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-slate-500">
            {post.school_tag ?? post.author?.university ?? "Campus"} · {formatOrbitTime(post.created_at)}
            {post.edited_at ? " · edited" : ""}
          </p>
        </div>
        <button
          onClick={report}
          className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-white/5 transition-colors"
          aria-label="Report post"
        >
          •••
        </button>
      </header>

      {/* CONTENT */}
      {post.content && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
          {post.content}
        </p>
      )}

      {/* IMAGES */}
      {post.images && post.images.length > 0 && (
        <div
          className={`mt-3 grid gap-1 overflow-hidden rounded-md ${
            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.images.map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt={`Post image ${index + 1}`}
              loading="lazy"
              className="aspect-square h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ))}
        </div>
      )}

      {/* ACTIONS */}
      <footer className="mt-3 flex flex-wrap gap-1 border-t border-white/5 pt-2 text-xs">
        <button
          disabled={busy}
          onClick={() => action("like")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 ${
            post.liked ? "text-campus-400" : "text-slate-400"
          }`}
        >
          <span>{post.liked ? "♥" : "♡"}</span>
          <span>{post.like_count > 0 ? post.like_count : "Like"}</span>
        </button>
        
        <button
          type="button"
          onClick={onCommentAction}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-400 transition-colors hover:bg-white/5"
        >
          <span>💬</span>
          <span>{post.comment_count > 0 ? post.comment_count : "Comment"}</span>
        </button>

        <button
          disabled={busy}
          onClick={() => action("save")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 ${
            post.saved ? "text-amber-400" : "text-slate-400"
          }`}
        >
          <span>{post.saved ? "🔖" : "📑"}</span>
          <span className="hidden sm:inline">{post.saved ? "Saved" : "Save"}</span>
        </button>

        {post.poster_id === userId && (
          <button
            onClick={remove}
            className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <span>Delete</span>
          </button>
        )}
      </footer>
    </article>
  );
}
