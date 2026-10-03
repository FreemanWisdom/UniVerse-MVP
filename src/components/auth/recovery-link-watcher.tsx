"use client";

import { useEffect } from "react";

/**
 * Routes Supabase recovery links that land on the public site to the
 * dedicated reset page.
 *
 * Recovery links resolve back to the project's site URL (the root of this
 * site) whenever the requested redirect target isn't allowlisted, and they
 * carry the recovery session as a URL hash — which server components
 * cannot see. This watcher forwards the full URL (query + hash) to
 * /reset-password before any session is established, so the recovery
 * session never leaks into the logged-in app experience.
 *
 * Non-recovery hashes (e.g. magic-link sign-ins) are left untouched.
 */
export function RecoveryLinkWatcher() {
  useEffect(() => {
    const hash = window.location.hash;
    const isRecoveryHash =
      hash.includes("type=recovery") || hash.includes("recovery_token=");
    if (isRecoveryHash && window.location.pathname !== "/reset-password") {
      // Full navigation (not router.replace) so the hash is preserved
      // exactly; the reset page reads the raw URL to detect the session.
      const query = window.location.search || "";
      window.location.replace(`/reset-password${query}${hash}`);
    }
  }, []);

  return null;
}
