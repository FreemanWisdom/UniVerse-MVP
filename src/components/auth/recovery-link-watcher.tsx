"use client";

import { useEffect } from "react";

/**
 * Routes Supabase email links that land on the public site to the right page.
 *
 * When the project's redirect allow-list is empty, GoTrue falls back to the
 * site URL and delivers the session as a URL hash (implicit-flow tokens:
 * `#access_token=…&refresh_token=…`) — which server components cannot see.
 * This watcher forwards those to /reset-password before any session is
 * established, so the recovery session never leaks into the logged-in app
 * experience.
 *
 * The allow-list now covers the app's own URLs, so recovery links normally
 * arrive at /reset-password directly with a PKCE code; this remains as a
 * safety net for older links and non-PKCE flows.
 */
export function RecoveryLinkWatcher() {
  useEffect(() => {
    const hash = window.location.hash;
    // GoTrue's implicit hash carries exactly these keys; older links may
    // also mark the type explicitly. Either shape counts as a recovery
    // handoff — email links are the only thing that produces it.
    const isRecoveryHash =
      (hash.includes("access_token=") && hash.includes("refresh_token=")) ||
      hash.includes("type=recovery") ||
      hash.includes("recovery_token=");
    if (isRecoveryHash && window.location.pathname !== "/reset-password") {
      // Full navigation (not router.replace) so the hash is preserved
      // exactly; the reset page reads the raw URL to detect the session.
      const query = window.location.search || "";
      window.location.replace(`/reset-password${query}${hash}`);
    }
  }, []);

  return null;
}
