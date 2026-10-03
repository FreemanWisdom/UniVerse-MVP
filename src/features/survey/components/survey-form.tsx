"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { IconStar } from "@/components/icons";

const FEATURES = [
  "Orbit",
  "Campus Chat",
  "Study Hub",
  "Study Tribes",
  "AI Tutor",
  "Campus Whisper",
  "Notifications",
];

const RECOMMEND_OPTIONS = ["Yes", "Maybe", "No"] as const;

interface Answers {
  overall_rating: number;
  features_used: string[];
  missing: string;
  recommend: string;
  notes: string;
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className="flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-surface-200/70"
        >
          <IconStar
            className={
              n <= value ? "h-6 w-6 fill-campus-500 text-campus-500" : "h-6 w-6 text-surface-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

export function SurveyForm() {
  const [overall, setOverall] = useState(0);
  const [features, setFeatures] = useState<string[]>([]);
  const [missing, setMissing] = useState("");
  const [recommend, setRecommend] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (f: string) => {
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (overall === 0) {
      setError("Please rate your overall experience before submitting.");
      return;
    }

    const answers: Answers = {
      overall_rating: overall,
      features_used: features,
      missing: missing.trim(),
      recommend,
      notes: notes.trim(),
    };

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        throw new Error("You need to be signed in to submit the survey.");
      }

      const { error: insertErr } = await supabase
        .from("survey_responses")
        .upsert(
          { user_id: userData.user.id, answers },
          { onConflict: "user_id" }
        );

      if (insertErr) throw insertErr;

      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not submit the survey. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-campus-800 bg-campus-950/40 p-6 text-center">
        <p className="font-display text-lg font-bold text-foreground">Thank you!</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Your feedback is in. It goes straight to the team building UniVerse and
          shapes what we ship next.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Overall */}
      <fieldset className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          Overall, how is your UniVerse experience so far?
        </legend>
        <div className="mt-2">
          <StarRating value={overall} onChange={setOverall} label="Overall experience rating" />
        </div>
      </fieldset>

      {/* Features used */}
      <fieldset className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          Which features do you use most?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEATURES.map((f) => {
            const active = features.includes(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => toggleFeature(f)}
                className={
                  active
                    ? "min-h-[36px] rounded-full border border-campus-500 bg-campus-950 px-3 text-xs font-semibold text-campus-400"
                    : "min-h-[36px] rounded-full border border-surface-300 bg-surface-100 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-campus-700"
                }
              >
                {f}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Missing */}
      <div className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <label htmlFor="survey-missing" className="text-sm font-semibold text-foreground">
          What&apos;s missing or could be better?
        </label>
        <textarea
          id="survey-missing"
          value={missing}
          onChange={(e) => setMissing(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="One thing that would make UniVerse better for you…"
          className="mt-2 w-full resize-none rounded-lg border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-foreground placeholder:text-slate-500 focus:border-campus-500 focus:outline-none focus:ring-1 focus:ring-campus-500"
        />
      </div>

      {/* Recommend */}
      <fieldset className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          Would you recommend UniVerse to a coursemate?
        </legend>
        <div className="mt-2 flex gap-2">
          {RECOMMEND_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={recommend === opt}
              onClick={() => setRecommend(opt)}
              className={
                recommend === opt
                  ? "min-h-[36px] flex-1 rounded-lg border border-campus-500 bg-campus-950 text-sm font-semibold text-campus-400"
                  : "min-h-[36px] flex-1 rounded-lg border border-surface-300 bg-surface-100 text-sm text-slate-300 transition-colors hover:border-campus-700"
              }
            >
              {opt}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Notes */}
      <div className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <label htmlFor="survey-notes" className="text-sm font-semibold text-foreground">
          Anything else you want us to know?{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="survey-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Problems you hit, ideas, anything at all…"
          className="mt-2 w-full resize-none rounded-lg border border-surface-300 bg-surface-100 px-3 py-2 text-sm text-foreground placeholder:text-slate-500 focus:border-campus-500 focus:outline-none focus:ring-1 focus:ring-campus-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="min-h-[44px] w-full gap-2">
        {submitting ? "Submitting…" : "Submit survey"}
      </Button>
    </form>
  );
}
