"use client";

import { useCallback, useState } from "react";
import type { OrbitComment } from "../orbit.types";
import { createClient } from "@/lib/supabase/client";
import { createOrbitComment, deleteOrbitComment, loadOrbitComments } from "@/services/orbit";
import { validateComment } from "../orbit.validation";

export function OrbitComments({ postId, userId, count }: { postId: string; userId: string; count: number }) {
  const [comments, setComments] = useState<OrbitComment[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loadOrbitComments(createClient(), postId);
      setComments(result.comments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comments unavailable.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  async function toggle() {
    if (!open) {
      setOpen(true);
      await load();
    } else {
      setOpen(false);
    }
  }

  async function submit() {
    const validation = validateComment(text);
    if (validation) {
      setError(validation);
      return;
    }
    try {
      await createOrbitComment(createClient(), postId, userId, text, null);
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comment failed.");
    }
  }

  async function remove(commentId: string) {
    const previous = comments;
    setComments((current) => current.filter((comment) => comment.id !== commentId));
    try {
      await deleteOrbitComment(createClient(), commentId);
    } catch (e) {
      setComments(previous);
      setError(e instanceof Error ? e.message : "We couldn't delete that comment.");
    }
  }

  return <section className="mt-2" aria-label="Comments">
    <button type="button" onClick={toggle} aria-expanded={open} className="text-xs text-campus-400 hover:underline">
      {open ? "Hide comments" : `View comments${count > 0 ? ` (${count})` : ""}`}
    </button>
    {open && <div className="mt-3 space-y-3">
      {loading && <p role="status" className="text-xs text-slate-400">Loading comments…</p>}
      {!loading && !error && comments.length === 0 && <p className="text-xs text-slate-500">No comments yet.</p>}
      {!loading && comments.length > 0 && <div className="space-y-2">
        {comments.map((comment) => <div key={comment.id} className="rounded-lg bg-background/50 p-2 text-xs">
          <div className="flex justify-between gap-2">
            <strong>{comment.author?.full_name ?? "Student"}</strong>
            {comment.user_id === userId && <button type="button" onClick={() => void remove(comment.id)} className="text-slate-500">Delete</button>}
          </div>
          <p className="mt-1 text-slate-300">{comment.content}</p>
        </div>)}
      </div>}
      {error && <div role="alert" className="text-xs text-amber-300"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-1 underline">Retry</button></div>}
      <div className="flex gap-2">
        <input value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} placeholder="Write a comment…" aria-label="Write a comment" className="min-w-0 flex-1 rounded-lg border border-surface-300 bg-background px-3 py-2 text-xs" />
        <button type="button" onClick={() => void submit()} className="rounded-lg bg-campus-500 px-3 text-xs font-bold text-black">Send</button>
      </div>
    </div>}
  </section>;
}
