"use client";

import { useEffect, useState } from "react";

/**
 * TEST ENVIRONMENT indicator.
 *
 * Shows a small fixed badge whenever the app is NOT served from the
 * production domain (universeicos.app). This covers the Vercel staging
 * URL and local development alike. It is presentation-only: no feature
 * flags, no behavior change, no test data.
 *
 * Why it matters: staging deployments deliberately connect to the live
 * Supabase backend, so anything done on the staging URL writes real
 * data. The badge exists to keep that fact visible during testing.
 *
 * Mounted via useEffect (client-only, identical SSR/client output) so it
 * cannot cause hydration mismatches.
 */
export function EnvironmentBadge() {
  const [isTestHost, setIsTestHost] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    // Deferred so the setState is not synchronous within the effect body
    // (avoids cascading renders; also satisfies the lint rule).
    const t = setTimeout(() => {
      setIsTestHost(host !== "universeicos.app" && host !== "www.universeicos.app");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!isTestHost) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-20 left-2 z-50 rounded-md border border-amber-500/40 bg-amber-950/80 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300 md:bottom-2"
    >
      Test environment
    </div>
  );
}
