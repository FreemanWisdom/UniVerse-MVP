"use client";

import { useEffect, useId } from "react";
import { IconLogout } from "@/components/icons";

interface LogoutConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  /** Visible heading. Doubles as the dialog's accessible name. */
  title?: string;
  /** Supporting line under the heading. */
  description?: string;
  /** Label of the destructive button. */
  confirmLabel?: string;
  /** Busy label of the destructive button. */
  busyLabel?: string;
  /** Failure text from the caller; never shown as success. */
  error?: string | null;
  /** Optional extra warning shown above the buttons (destructive actions). */
  warning?: string;
}

/**
 * Two-step confirmation for ending sessions.
 *
 * Defaults to the "Leave Orbit?" sign-out copy used from Settings and the
 * launch gate. Security actions that end sessions on OTHER devices (global
 * sign-out) reuse it with their own title/description/warning so the dialog
 * never implies a narrower blast radius than the operation actually has.
 *
 * `error` is rendered as an alert and the dialog stays open: a failed
 * sign-out must never look like a successful one.
 */
export function LogoutConfirmModal({
  open,
  onConfirm,
  onCancel,
  isLoading,
  title = "Leave Orbit?",
  description = "Are you sure you want to log out?",
  confirmLabel = "Yes, Logout",
  busyLabel = "Signing out…",
  error = null,
  warning,
}: LogoutConfirmModalProps) {
  const titleId = useId();
  const descriptionId = useId();

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
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-surface-200 bg-surface-100 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-950/60 text-red-500">
          <IconLogout className="h-6 w-6" />
        </div>

        <h2
          id={titleId}
          className="mt-4 font-display text-lg font-bold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <p id={descriptionId} className="mt-1.5 text-sm text-slate-400">
          {description}
        </p>

        {warning ? (
          <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/30 p-2.5 text-xs leading-relaxed text-red-200">
            {warning}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-h-[48px] w-full rounded-xl bg-red-500 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? busyLabel : confirmLabel}
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
