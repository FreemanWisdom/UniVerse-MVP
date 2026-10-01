"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

/**
 * Change password — wired to the existing Supabase auth API
 * (supabase.auth.updateUser). No new backend, no schema change.
 * Supabase may require a recent login for sensitive updates; that case is
 * surfaced as a clear re-sign-in hint rather than a raw error.
 */
export function PasswordSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resetForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setNotice("Password updated. Use it the next time you sign in.");
      resetForm();
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update password.";
      setError(
        /recent login|same as the old/i.test(message)
          ? "For security, sign out and sign back in, then try again."
          : message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Change password</p>
          <p className="text-xs text-slate-400">Update your sign-in password</p>
        </div>
        <Button
          type="button"
          variant={isOpen ? "ghost" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
          aria-expanded={isOpen}
        >
          {isOpen ? "Cancel" : "Change"}
        </Button>
      </div>

      {notice && !isOpen && (
        <p className="mt-3 border-t border-surface-200 pt-3 text-xs text-campus-400" role="status">
          {notice}
        </p>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 border-t border-surface-200 pt-3">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
              New password
            </label>
            <PasswordInput
              id="new-password"
              name="new_password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              name="confirm_password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat the new password"
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit" size="sm" disabled={isSubmitting} className="min-h-[36px]">
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
