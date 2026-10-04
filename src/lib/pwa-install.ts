"use client";

/**
 * Shared PWA one-tap install state.
 *
 * Browser facts this module encodes (verified against Chrome behavior):
 * - `beforeinstallprompt` fires at most ONCE per page load, and every
 *   listener receives the SAME event object.
 * - Chrome may invalidate the captured event later (time on page,
 *   engagement changes). Calling prompt() on a stale event shows no
 *   dialog and the promise can hang indefinitely — it neither resolves
 *   nor rejects.
 * - prompt() consumes the event: after any surface triggers it, no other
 *   surface may offer one-tap install again; they fall back to honest
 *   browser-menu guidance.
 * - Components that mount after the event fired (client-side navigation,
 *   e.g. Settings) must read the shared capture, not add a fresh listener.
 *
 * The capture is wired once per page by this module; every install surface
 * (floating pill, Settings card, post-tour invitation) subscribes to it.
 * Installation is never claimed to have happened unless the browser says so
 * (appinstalled / userChoice accepted / standalone display-mode).
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable" | "timeout";

let captured: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let wired = false;

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Trigger the native one-tap install prompt.
 *
 * Never hangs: a stale/invalidated event would otherwise leave the UI stuck
 * on "Installing…" forever, so the wait is capped at `timeoutMs` (generous —
 * a fresh prompt leaves its dialog open as long as the user wants, and a
 * late "accepted" is still picked up via the appinstalled event).
 */
export async function triggerInstall(timeoutMs = 20000): Promise<InstallOutcome> {
  const event = captured;
  captured = null;
  emit();
  if (!event) return "unavailable";
  try {
    const result = await Promise.race([
      (async () => {
        await event.prompt();
        return (await event.userChoice).outcome as InstallOutcome;
      })(),
      new Promise<InstallOutcome>(resolve => {
        setTimeout(() => resolve("timeout"), timeoutMs);
      }),
    ]);
    return result;
  } catch {
    // The browser rejected/invalidated the prompt — no dialog was shown.
    return "unavailable";
  }
}

export function getCapturedInstallPrompt(): BeforeInstallPromptEvent | null {
  return captured;
}

export function subscribeInstallState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isIOSUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  return (
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1)
  );
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

/** Wire the global capture listeners once per page (client only). */
export function ensureInstallListeners(): void {
  if (typeof window === "undefined" || wired) return;
  wired = true;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    captured = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    captured = null;
    emit();
  });
}
