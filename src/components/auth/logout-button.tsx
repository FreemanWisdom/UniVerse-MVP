"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthTransition } from "@/components/auth/auth-transition";
import { LogoutConfirmModal } from "@/components/auth/logout-confirm-modal";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const leaveToPublicSite = () => {
    router.push("/");
    router.refresh();
  };

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // The session is already invalidated server-side — the overlay is a
      // brief brand moment, not a fake "still signing out" state.
      setShowTransition(true);
      setConfirmOpen(false);
    } catch {
      // Sign-out failed: don't fake success. Send the user to the login
      // page where the current state is re-evaluated server-side.
      router.push("/login");
      router.refresh();
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
        onClick={() => setConfirmOpen(true)}
        disabled={isLoading}
        className="min-h-[36px] text-slate-300 hover:text-foreground"
      >
        Sign out
      </Button>

      <LogoutConfirmModal
        open={confirmOpen}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
        isLoading={isLoading}
      />

      {showTransition ? <AuthTransition variant="sign-out" onDone={leaveToPublicSite} /> : null}
    </>
  );
}
