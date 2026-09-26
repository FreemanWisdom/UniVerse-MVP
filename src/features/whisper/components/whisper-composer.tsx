"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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

        // Fetch the user's profile to get their university (authoritative school tag)
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
      setContent(""); // Clear input on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardContent className="pt-6">
        <div className="mb-2 text-sm text-slate-400">
          Posting as: <span className="font-semibold text-slate-200">{anonLabel || "Loading identity..."}</span>
        </div>
        
        <textarea
          className="w-full min-h-[100px] p-3 rounded-md bg-slate-900 border border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          placeholder="What's happening on campus?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          aria-label="Whisper content"
        />

        {error && (
          <p className="text-red-400 text-xs mt-2" role="alert">{error}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div 
            className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-slate-500'}`}
            aria-live="polite"
          >
            {charsRemaining} characters remaining
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={isEmpty || isOverLimit || isSubmitting}
            className="w-24"
          >
            {isSubmitting ? "Posting..." : "Whisper"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
