"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthTransition } from "@/components/auth/auth-transition";
import { LogoutConfirmModal } from "@/components/auth/logout-confirm-modal";

/**
 * "Sign out of all devices" — the explicit security action.
 *
 * `scope: 'global'` revokes every refresh token on the account, including the
 * one in this browser, so the caller is signed out here too. It is deliberately
 * separate from the ordinary Sign out button (scope: 'local') and always goes
 * through a confirmation that states the blast radius.
 */
export function SignOutEverywhereButton() {
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

  const handleSignOutEverywhere = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });

      if (signOutError) {
        throw signOutError;
      }

      setShowTransition(true);
      setConfirmOpen(false);
    } catch {
      // Never report a partial result as done: the account may still have live
      // sessions elsewhere, and this browser is certainly still signed in.
      setError(
        "We couldn't sign out all devices. Your sessions may still be active — try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openConfirm}
        disabled={isLoading}
        className="min-h-[36px]"
      >
        Sign out everywhere
      </Button>

      <LogoutConfirmModal
        open={confirmOpen}
        onConfirm={handleSignOutEverywhere}
        onCancel={closeConfirm}
        isLoading={isLoading}
        title="Sign out of all devices?"
        description="This ends every UniVerse session on your account, including this one."
        warning="You will need to sign in again on every device, including this browser."
        confirmLabel="Sign out everywhere"
        busyLabel="Signing out everywhere…"
        error={error}
      />

      {showTransition ? (
        <AuthTransition
          variant="sign-out"
          title="Signed out everywhere"
          caption="All devices have been signed out"
          onDone={leaveToPublicSite}
        />
      ) : null}
    </>
  );
}
