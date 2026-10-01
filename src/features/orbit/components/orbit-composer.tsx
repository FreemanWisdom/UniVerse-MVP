"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createOrbitPost } from "@/services/orbit";
import { validatePost } from "../orbit.validation";
import { ORBIT_MAX_IMAGES, ORBIT_MAX_POST_LENGTH } from "../orbit.constants";

export function OrbitComposer({
  userId,
  university,
  onCreated,
}: {
  userId: string;
  university: string;
  onCreated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function submit() {
    const validation = validatePost(content, files);
    if (validation) {
      setStatus(validation);
      return;
    }
    setStatus("Publishing…");
    try {
      await createOrbitPost(createClient(), userId, university, content, files, []);
      setContent("");
      setFiles([]);
      setStatus("");
      setOpen(false);
      await onCreated();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "We couldn't publish your post.");
    }
  }

  return (
    <section className="rounded-lg border border-white/5 bg-surface-100/40 p-3 sm:p-4 mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 text-left text-sm text-slate-400 group"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-campus-500/20 text-campus-400 transition-colors group-hover:bg-campus-500/30">
            ✦
          </span>
          <span className="rounded-full bg-surface-200/50 px-4 py-2 flex-1 border border-transparent transition-colors group-hover:border-white/10 group-hover:bg-surface-200 text-slate-400">
            Share something with your campus...
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-campus-500/20 text-campus-400">
              ✦
            </span>
            <div className="flex-1 space-y-2">
              <textarea
                autoFocus
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={ORBIT_MAX_POST_LENGTH}
                rows={3}
                placeholder="What's happening on campus?"
                className="w-full resize-y bg-transparent p-1 text-sm text-foreground outline-none placeholder:text-slate-500"
                aria-label="Post content"
              />
              {files.length > 0 && (
                <div className="text-xs text-slate-400 bg-surface-200/50 p-2 rounded-md">
                  {files.length} image{files.length === 1 ? "" : "s"} selected (max {ORBIT_MAX_IMAGES})
                </div>
              )}
            </div>
          </div>

          {status && <p role="status" className="text-xs text-amber-300 pl-11">{status}</p>}

          <div className="flex items-center justify-between border-t border-white/5 pt-3 pl-11">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                onClick={() => input.current?.click()}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-campus-400 transition-colors"
              >
                <span>📷</span>
                <span className="hidden sm:inline">Photo</span>
              </button>
              <input
                ref={input}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
              <span className="px-2">{content.length}/{ORBIT_MAX_POST_LENGTH}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setStatus("");
                }}
                className="rounded-full px-4 py-1.5 text-xs font-medium hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={status === "Publishing…"}
                className="rounded-full bg-campus-500 px-4 py-1.5 text-xs font-bold text-black transition-colors hover:bg-campus-400 disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
