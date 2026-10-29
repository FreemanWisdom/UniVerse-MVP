"use client";

import { useEffect, useState } from "react";
import {
  ensureInstallListeners,
  getCapturedInstallPrompt,
  isIOSUserAgent,
  isInstallPromotionSnoozed,
  isStandaloneDisplay,
  reconcileInstallState,
  snoozeInstallPromotion,
  subscribeInstallState,
  triggerInstall,
} from "@/lib/pwa-install";

/**
 * Floating install affordance (Phase 8 request).
 *
 * A small fixed pill, bottom-right, shown to EVERY signed-in user who does
 * not have the app installed — a one-tap install where the browser exposes
 * beforeinstallprompt, iOS Add-to-Home-Screen guidance on Safari, and
 * honest browser-menu guidance everywhere else.
 *
 * Consistency rules (phase 12):
 * - "Not now" snoozes the pill for 7 days; it returns after that.
 * - A user who uninstalls the app sees the pill again immediately: the
 *   stored installed-flag no longer matches the browser display-mode, so
 *   reconcileInstallState() clears the snooze on the next visit.
 * - Installing (appinstalled) clears the snooze for good benefit; the pill
 *   disappears because display-mode reports standalone.
 * Shares the single captured install event with the Settings card and the
 * post-tour invitation through src/lib/pwa-install — one prompt() consumes
 * it for everyone. A stale event never leaves the user with no feedback:
 * the pill falls back to honest browser-menu guidance.
 */
export function FloatingInstallButton() {
  const [available, setAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [snoozed, setSnoozed] = useState(true); // hidden until mount checks pass
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showFallbackHint, setShowFallbackHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureInstallListeners();
    // Hydration-safe device detection (deferred setState in effect, per the
    // lint rule — same approach as the Settings InstallPrompt).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(isStandaloneDisplay());
    // If the app was installed before and is now running in a browser tab,
    // the user uninstalled it: drop the snooze so the promotion returns.
    reconcileInstallState();
    setIsIOS(isIOSUserAgent());
    setSnoozed(isInstallPromotionSnoozed());

    const unsubscribe = subscribeInstallState(() => {
      setAvailable(getCapturedInstallPrompt() !== null);
      setIsStandalone(isStandaloneDisplay());
    });
    setAvailable(getCapturedInstallPrompt() !== null);

    const onInstalled = () => setShowFallbackHint(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      unsubscribe();
    };
  }, []);

  // Shown to every non-installed user (not only where a one-tap API exists):
  // browsers without the API get the honest menu guidance below.
  const visible = !isStandalone && !snoozed;
  if (!visible) return null;

  const dismiss = () => {
    setSnoozed(true);
    snoozeInstallPromotion();
  };

  const install = async () => {
    if (available) {
      // Never hangs: stale events resolve via the shared timeout, and the
      // pill then points at the browser menu instead of silently doing nothing.
      setBusy(true);
      const result = await triggerInstall();
      setBusy(false);
      setAvailable(getCapturedInstallPrompt() !== null);
      if (result === "unavailable" || result === "timeout") {
        setAvailable(false);
        setShowFallbackHint(true);
        setTimeout(() => setShowFallbackHint(false), 12000);
      }
      return;
    }
    if (isIOS) {
      // iOS: toggle the manual Add-to-Home-Screen hint.
      setShowIOSHint(v => !v);
      return;
    }
    // No usable one-tap event (e.g. after a stale no-op prompt): toggle the
    // browser-menu guidance so the user is never left with a silent button.
    setShowFallbackHint(v => !v);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 md:bottom-5">
      {showIOSHint && (
        <div className="w-56 rounded-lg border border-surface-300 bg-surface-100 p-3 text-xs text-foreground shadow-xl">
          <p className="font-semibold">Install on iPhone</p>
          <p className="mt-1 text-slate-500">
            Tap the Share button in Safari, then choose{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>.
          </p>
        </div>
      )}
      {showFallbackHint && (
        <div className="w-64 rounded-lg border border-surface-300 bg-surface-100 p-3 text-xs text-foreground shadow-xl">
          <p className="font-semibold">One-tap install didn&rsquo;t open</p>
          <p className="mt-1 text-slate-500">
            Use your browser&rsquo;s menu:{" "}
            <span className="font-medium text-foreground">⋮ → Install app</span> or{" "}
            <span className="font-medium text-foreground">Add to Home screen</span>.
          </p>
        </div>
      )}
      <div className="flex items-center overflow-hidden rounded-full border border-campus-700/60 bg-campus-500 text-black shadow-[0_4px_16px_-4px_rgba(34,197,94,0.5)]">
        <button
          type="button"
          onClick={() => void install()}
          disabled={busy}
          className="flex h-11 items-center gap-2 pl-4 pr-2 text-sm font-semibold transition-colors hover:bg-campus-400 disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          {busy ? "Installing…" : "Install app"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install button"
          className="flex h-11 w-9 items-center justify-center text-black/60 transition-colors hover:text-black"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
