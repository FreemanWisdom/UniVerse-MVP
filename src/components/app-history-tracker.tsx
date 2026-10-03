"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DEPTH_KEY = "universe-nav-depth";

/**
 * Counts in-app navigations per tab (sessionStorage) so BackButton can tell
 * "arrived via an in-app link" (safe to history.back()) apart from "landed on
 * this URL directly" (use the fallback href instead).
 *
 * Next.js (this version) keeps no readable history index in history.state,
 * so we track depth ourselves: every mount and every client-side route
 * change increments the counter. A page reached as the first app view in
 * the tab (fresh deep link) sees depth 1.
 */
export function AppHistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const n = parseInt(window.sessionStorage.getItem(DEPTH_KEY) || "0", 10);
      window.sessionStorage.setItem(DEPTH_KEY, String(n + 1));
    } catch {
      /* private mode: BackButton falls back to its href */
    }
  }, [pathname]);

  return null;
}
