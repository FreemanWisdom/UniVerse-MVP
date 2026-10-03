"use client";
import { useState } from "react";
import { IconHeart, IconMessageSquare, IconShare, IconFlag } from "@/components/icons";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserLink } from "@/components/user/user-link";
import type { OrbitPost } from "../orbit.types";
import { displayName, formatOrbitTime } from "../orbit.utils";
import { createClient } from "@/lib/supabase/client";
import { deleteOrbitPost, reportOrbitPost, toggleOrbitLike } from "@/services/orbit";
import { OrbitShareDialog } from "./orbit-share-dialog";
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
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState("");
  const name = displayName(post.author, post.poster_name ?? undefined);
  const supabase = createClient();

  async function like() {
    if (busy) return;
    setBusy(true);
    const next = !post.liked;
    onChangeAction({ ...post, liked: next, like_count: post.like_count + (next ? 1 : -1) });
    try {
      await toggleOrbitLike(supabase, post.id, userId, post.liked);
    } catch {
      onChangeAction(post);
    } finally {
      setBusy(false);
    }
  }

  function onShared(recipientName: string) {
    setToast(`Shared with ${recipientName} ✓`);
    window.setTimeout(() => setToast(""), 3000);
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
        <UserAvatar
          profile={{ id: post.author?.id, full_name: name, avatar_url: post.author?.avatar_url }}
          size="sm"
        />
        <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-1.5">
          <UserLink
            userId={post.author?.id}
            name={name}
            className="text-sm font-semibold text-foreground"
          />
          <p className="truncate text-xs text-slate-500">
            {post.school_tag ?? post.author?.university ?? "Campus"} · {formatOrbitTime(post.created_at)}
            {post.edited_at ? " · edited" : ""}
          </p>
        </div>
        <button
          onClick={report}
          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-red-400"
          aria-label="Report post"
          title="Report post"
        >
          <IconFlag size={16} />
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

      {toast ? (
        <p className="mt-2 text-xs text-campus-300" role="status">{toast}</p>
      ) : null}

      {sharing ? (
        <OrbitShareDialog
          post={post}
          onClose={() => setSharing(false)}
          onShared={onShared}
        />
      ) : null}

      {/* ACTIONS */}
      <footer className="mt-3 flex flex-wrap gap-1 border-t border-white/5 pt-2 text-xs">
        <button
          disabled={busy}
          onClick={like}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 ${
            post.liked ? "text-campus-400" : "text-slate-400"
          }`}
        >
          <IconHeart size={14} fill={post.liked ? "currentColor" : "none"} />
          <span>{post.like_count > 0 ? post.like_count : "Like"}</span>
        </button>
        
        <button
          type="button"
          onClick={onCommentAction}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-400 transition-colors hover:bg-white/5"
        >
          <IconMessageSquare size={14} />
          <span>{post.comment_count > 0 ? post.comment_count : "Comment"}</span>
        </button>

        <button
          type="button"
          onClick={() => setSharing(true)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-400 transition-colors hover:bg-white/5"
          aria-label="Share post in chat"
        >
          <IconShare size={14} />
          <span>Share</span>
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
