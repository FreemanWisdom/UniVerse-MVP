import { Badge } from "@/components/ui/badge";
import { WhisperFeed } from "@/features/whisper/components/whisper-feed";

export default function WhisperPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Whisper</h1>
          <p className="text-sm text-slate-400">Anonymous and privacy-first campus voice.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Privacy Protected</Badge>
        </div>
      </div>

      <WhisperFeed />
    </div>
  );
}
