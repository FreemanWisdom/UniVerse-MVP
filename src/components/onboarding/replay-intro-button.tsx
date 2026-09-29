"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "universe-onboarding-v1";

/**
 * Settings action: clears the onboarding flag and reloads so the welcome
 * carousel shows again. Pure client-side presentation preference.
 */
export function ReplayIntroButton() {
  const [done, setDone] = useState(false);

  const replay = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
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
