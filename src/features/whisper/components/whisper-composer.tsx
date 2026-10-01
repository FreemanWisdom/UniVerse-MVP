"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateWhisperIdentity, createWhisper } from "@/services/whisper/interaction.service";
import { WHISPER_CONSTANTS } from "@/features/whisper/whisper.constants";
import { WhisperPostUI } from "@/features/whisper/whisper.types";

interface WhisperComposerProps {
  onPostCreated: (post: WhisperPostUI) => void;
}

export function WhisperComposer({ onPostCreated }: WhisperComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anonLabel, setAnonLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const charsRemaining = WHISPER_CONSTANTS.MAX_LENGTH - content.length;
  const isOverLimit = charsRemaining < 0;
  const isEmpty = content.trim().length === 0;

  useEffect(() => {
    async function loadIdentity() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError("You must be logged in to whisper.");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("university")
          .eq("id", user.id)
          .maybeSingle();
          
        if (profileError || !profile || !profile.university) {
          setError("Your school/campus information is unavailable. Please update your profile.");
          return;
        }

        const label = await getOrCreateWhisperIdentity(supabase, profile.university);
        setAnonLabel(label);
      } catch (err) {
        console.error("Failed to load identity", err);
        setError("Could not load anonymous identity. Try again later.");
      }
    }

    loadIdentity();
  }, [supabase]);

  const handleSubmit = async () => {
    if (isEmpty || isOverLimit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newPost = await createWhisper(supabase, content.trim());
      onPostCreated(newPost);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-lg border border-white/5 bg-surface-100/40 p-3 sm:p-4 mb-4">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 font-semibold text-slate-300">
          <span className="text-xs">🤫</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-xs text-slate-400">
            Posting anonymously as: <span className="font-semibold text-slate-200">{anonLabel || "Loading identity..."}</span>
          </div>
          
          <textarea
            className="w-full resize-y bg-transparent p-1 text-sm text-foreground outline-none placeholder:text-slate-500 min-h-[80px]"
            placeholder="What's happening on campus?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            aria-label="Whisper content"
          />

          {error && (
            <p className="text-red-400 text-xs mt-2" role="alert">{error}</p>
          )}

          <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
            <div 
              className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-slate-500'}`}
              aria-live="polite"
            >
              {charsRemaining}
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isEmpty || isOverLimit || isSubmitting}
              className="rounded-full bg-slate-200 px-4 py-1.5 text-xs font-bold text-black transition-colors hover:bg-white disabled:opacity-50"
            >
              {isSubmitting ? "Posting..." : "Whisper"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
