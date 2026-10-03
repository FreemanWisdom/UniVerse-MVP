import { WhisperFeed } from "@/features/whisper/components/whisper-feed";

export default function WhisperPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h1 className="text-lg font-bold tracking-tight text-foreground">Whisper</h1>
        <p className="text-xs text-slate-500">Anonymous, privacy-first campus voice.</p>
      </div>

      <WhisperFeed />
    </div>
  );
}
