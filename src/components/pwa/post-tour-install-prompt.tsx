"use client";

import { useEffect, useRef, useState } from "react";
import {
  ensureInstallListeners,
  getCapturedInstallPrompt,
  isInstallPromotionSnoozed,
  isIOSUserAgent,
  isStandaloneDisplay,
  markInstallObserved,
  snoozeInstallPromotion,
  subscribeInstallState,
  triggerInstall,
  type InstallOutcome,
} from "@/lib/pwa-install";

/**
 * Post-tour install invitation (Phase 7).
 *
 * Shown once, right after the welcome tour completes. Behavior:
 * - Listens for the tour's "universe:tour-completed" signal.
 * - Already installed (standalone display-mode): never shows.
 * - Chromium/Android (captured beforeinstallprompt): clear "Install app"
 *   action via the shared triggerInstall() — which never hangs on a stale
 *   event; on a no-op/timeout the card switches to honest browser-menu
 *   guidance instead of sitting on "Installing…" forever.
 * - iOS Safari and browsers without an install API: platform-specific
 *   guidance (Share → Add to Home Screen / browser menu). Never pretends
 *   an install happened.
 * - Dismissal ("Not now"), install completion, and standalone state all
 *   persist the "seen" flag — the card never nags twice per device.
 * - Purely an invitation: nothing is blocked and installation is never
 *   claimed to be mandatory.
 * Uses no service worker of its own — the existing notifications-sw.js
 * registration is the app's one and only SW.
 */

const TOUR_DONE_EVENT = "universe:tour-completed";
const TITLE_ID = "install-prompt-title";
const DESCRIPTION_ID = "install-prompt-description";

export function PostTourInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [available, setAvailable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<InstallOutcome | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    ensureInstallListeners();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(isIOSUserAgent());

    const close = () => setVisible(false);

    const onInstalled = () => {
      markInstallObserved();
      close();
    };
    const onTourDone = () => {
      if (isStandaloneDisplay()) { markInstallObserved(); return; }
      // Consistent promotion (phase 12): the post-tour card respects the
      // same bounded snooze as the floating install pill instead of a
      // permanent per-device flag — an uninstall reinstates promotion.
      if (isInstallPromotionSnoozed()) return;
      setVisible(true);
    };

    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(TOUR_DONE_EVENT, onTourDone);
    const unsubscribe = subscribeInstallState(() => {
      setAvailable(getCapturedInstallPrompt() !== null);
    });
    setAvailable(getCapturedInstallPrompt() !== null);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(TOUR_DONE_EVENT, onTourDone);
      unsubscribe();
    };
  }, []);

  /**
   * Modal shell. The card behaved like a modal on desktop (full-screen
   * scrim, every pointer event captured) while announcing itself as
   * non-modal, and on mobile it blocked nothing but let the page scroll
   * underneath. This makes it a real modal at every breakpoint and ties the
   * ARIA to what actually happens.
   */
  useEffect(() => {
    if (!visible) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Lock both the root and the body: with only the body locked, the
    // document element still scrolls behind the prompt.
    const root = document.documentElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    document.body.style.overflow = "hidden";
    root.style.overflow = "hidden";

    dialogRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;

      const target = previouslyFocused.current;
      previouslyFocused.current = null;
      if (target && target.isConnected && target !== document.body) {
        target.focus({ preventScroll: true });
        return;
      }
      // The invitation opens from the tour's finish action, which no longer
      // exists by the time it closes — land on real content instead of
      // stranding focus on a removed node.
      const fallback = document.querySelector<HTMLElement>(
        'main a[href], main button, main [tabindex]:not([tabindex="-1"]), header a[href]'
      );
      if (fallback?.isConnected) fallback.focus({ preventScroll: true });
      else (document.activeElement as HTMLElement | null)?.blur();
    };
  }, [visible]);

  const markSeenAndClose = () => {
    snoozeInstallPromotion();
    setVisible(false);
  };

  /** Escape closes it; Tab / Shift+Tab stay inside it. */
  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      markSeenAndClose();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.getClientRects().length > 0 || el === document.activeElement);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || active === dialog) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const install = async () => {
    setBusy(true);
    const result = await triggerInstall();
    setBusy(false);
    setOutcome(result);
    setAvailable(getCapturedInstallPrompt() !== null);
    if (result === "accepted" || result === "dismissed") markSeenAndClose();
  };

  if (!visible || isStandaloneDisplay()) return null;

  // A stale/no-op one-tap prompt falls through to the always-true path:
  // the browser's own menu (⋮ → Install app / Add to Home screen).
  const showGuidance = outcome === "unavailable" || outcome === "timeout";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-describedby={DESCRIPTION_ID}
      tabIndex={-1}
      onKeyDown={onDialogKeyDown}
      className="fixed inset-0 z-[55] flex items-end justify-center bg-background/90 p-4 pb-6 backdrop-blur-sm outline-none sm:items-center sm:p-6"
    >
      <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-surface-50 p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-200 text-campus-300" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2
              id={TITLE_ID}
              className="font-display text-sm font-bold tracking-tight text-foreground"
            >
              Add Universe ICOS to your home screen
            </h2>
            <p className="text-xs text-slate-400">Faster access, full-screen, app-like.</p>
          </div>
        </div>

        <div id={DESCRIPTION_ID} className="mt-3 text-sm text-slate-400">
          {showGuidance ? (
            <p>
              The one-tap install didn&rsquo;t open on its own — use your browser&rsquo;s menu:{" "}
              <span className="font-semibold text-foreground">⋮ → Install app</span> (or{" "}
              <span className="font-semibold text-foreground">Add to Home screen</span>). It takes
              two taps and always works.
            </p>
          ) : available ? (
            <p>
              Install the app with one tap — it opens straight to your campus, no browser bar.
              Totally optional.
            </p>
          ) : isIOS ? (
            <p>
              On your iPhone or iPad: tap <span className="font-semibold text-foreground">Share</span>{" "}
              <span className="text-slate-500">(the square with an arrow)</span>, then{" "}
              <span className="font-semibold text-foreground">Add to Home Screen</span>.
            </p>
          ) : (
            <p>
              Your browser can install this site from its menu — look for{" "}
              <span className="font-semibold text-foreground">Install app</span> or{" "}
              <span className="font-semibold text-foreground">Add to Home screen</span>.
            </p>
          )}
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {busy
            ? "Installing the app…"
            : showGuidance
              ? "One-tap install is unavailable. Use your browser menu to install."
              : ""}
        </p>

        <div className="mt-4 flex items-center gap-3">
          {(available || busy) && !showGuidance ? (
            <button
              type="button"
              onClick={() => void install()}
              disabled={busy}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-campus-500 px-4 text-sm font-semibold text-background transition-colors hover:bg-campus-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 disabled:opacity-50"
            >
              {busy ? "Installing…" : "Install app"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={markSeenAndClose}
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-surface-300 bg-surface-50 px-4 text-sm font-medium text-slate-300 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
          >
            {available && !showGuidance ? "Not now" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
