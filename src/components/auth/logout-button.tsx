"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthTransition } from "@/components/auth/auth-transition";
import { LogoutConfirmModal } from "@/components/auth/logout-confirm-modal";

/**
 * Ordinary sign-out. Ends THIS device's session only.
 *
 * `scope: 'local'` is explicit on purpose: the Supabase auth client defaults
 * to `scope: 'global'`, which revokes every refresh token the account holds.
 * Signing out on a borrowed phone must not evict the user's laptop. Ending all
 * sessions is a separate, explicitly named action
 * (components/auth/sign-out-everywhere-button.tsx).
 */
export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leaveToPublicSite = () => {
    router.push("/");
    router.refresh();
  };

  const openConfirm = () => {
    setError(null);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (isLoading) return;
    setConfirmOpen(false);
    setError(null);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });

      if (signOutError) {
        throw signOutError;
      }

      // The session is already invalidated — the overlay is a brief brand
      // moment, not a fake "still signing out" state.
      setShowTransition(true);
      setConfirmOpen(false);
    } catch {
      // Sign-out failed. The session is still live, so there is nothing to
      // celebrate and nowhere to redirect: navigating anywhere would either
      // bounce back (an authenticated visitor cannot stay on /login) or imply
      // success. Keep the dialog open with a recoverable error instead.
      setError(
        "We couldn't sign you out. Check your connection and try again — you're still signed in."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={openConfirm}
        disabled={isLoading}
        className="min-h-[36px] text-slate-300 hover:text-foreground"
      >
        Sign out
      </Button>

      <LogoutConfirmModal
        open={confirmOpen}
        onConfirm={handleSignOut}
        onCancel={closeConfirm}
        isLoading={isLoading}
        title="Sign out of this device?"
        description="Your other devices will stay signed in."
        confirmLabel="Sign out"
        error={error}
      />

      {showTransition ? <AuthTransition variant="sign-out" onDone={leaveToPublicSite} /> : null}
    </>
  );
}
