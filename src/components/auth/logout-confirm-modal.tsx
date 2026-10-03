"use client";

import { useEffect } from "react";
import { IconLogout } from "@/components/icons";

interface LogoutConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * "Leave Orbit?" confirmation modal shown before signing out.
 * Design: red logout glyph in a circular badge, destructive confirm action,
 * neutral cancel below it.
 */
export function LogoutConfirmModal({
  open,
  onConfirm,
  onCancel,
  isLoading,
}: LogoutConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm logout"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-surface-200 bg-surface-100 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-950/60 text-red-500">
          <IconLogout className="h-6 w-6" />
        </div>

        <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
          Leave Orbit?
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Are you sure you want to log out?
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-h-[48px] w-full rounded-xl bg-red-500 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing out…" : "Yes, Logout"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-[48px] w-full rounded-xl bg-surface-200 text-sm font-semibold text-foreground transition-colors hover:bg-surface-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
