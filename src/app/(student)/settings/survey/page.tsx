import { BackButton } from "@/components/back-button";
import { SurveyForm } from "@/features/survey/components/survey-form";

export const metadata = {
  title: "UniVerse Survey",
};

export default function SurveyPage() {
  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <BackButton href="/settings" label="Back to settings" />

      <div>
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Feedback
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
          The UniVerse Survey
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Two minutes of your honest feedback. It goes straight to the team
          building UniVerse and shapes what we ship next.
        </p>
      </div>

      <SurveyForm />
    </div>
  );
}
