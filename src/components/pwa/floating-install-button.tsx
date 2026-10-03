"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "universe-install-float-dismissed";

/**
 * Floating install affordance (Phase 8 request).
 *
 * A small fixed pill, bottom-right, visible whenever the app is installable
 * on this device: Chrome/Edge/Android after beforeinstallprompt fires, or
 * iOS (manual Add to Home Screen flow). Hidden when already installed or
 * after the user dismisses it (persisted per device — same spirit as the
 * tour keys: presentation preference, no DB row).
 *
 * Shares the platform install logic with the Settings InstallPrompt and the
 * post-tour invitation but renders independently: the captured
 * beforeinstallprompt event is per-tab and never cached, so each surface
 * listens for its own event.
 */
export function FloatingInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until mount checks pass
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const nav = navigator as any;
    // Hydration-safe device detection (deferred setState in effect, per the
    // lint rule — same approach as the Settings InstallPrompt).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(
      window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true
    );
    setIsIOS(
      /iPad|iPhone|iPod/.test(nav.userAgent || "") ||
        (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
    );
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* private mode: treat as not dismissed */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowIOSHint(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const visible = !isStandalone && !dismissed && (!!deferredPrompt || isIOS);
  if (!visible) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      return;
    }
    // iOS: toggle the manual hint.
    setShowIOSHint(v => !v);
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
      <div className="flex items-center overflow-hidden rounded-full border border-campus-700/60 bg-campus-500 text-black shadow-[0_4px_16px_-4px_rgba(34,197,94,0.5)]">
        <button
          type="button"
          onClick={install}
          className="flex h-11 items-center gap-2 pl-4 pr-2 text-sm font-semibold transition-colors hover:bg-campus-400"
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
          Install app
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
