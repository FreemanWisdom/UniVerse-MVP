"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const VERSION_KEY = "universe-tour-version";

/**
 * Settings action: clears the completed-tour version so the welcome carousel
 * (current version) shows again on reload. Pure client-side presentation
 * preference. The legacy v1 key (if present) keeps honoring "v1 seen", but the
 * carousel still replays because the stored version drops below the current
 * tour version.
 */
export function ReplayIntroButton() {
  const [done, setDone] = useState(false);

  const replay = () => {
    try {
      window.localStorage.removeItem(VERSION_KEY);
    } catch {
      // ignore
    }
    setDone(true);
    window.location.reload();
  };

  return (
    <Button variant="outline" onClick={replay} aria-live={done ? "polite" : undefined}>
      {done ? "Reloading…" : "Replay intro"}
    </Button>
  );
}
