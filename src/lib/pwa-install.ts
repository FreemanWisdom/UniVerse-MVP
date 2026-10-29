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

/**
 * Install-promotion persistence (phase 12).
 *
 * Requirement: every user who has NOT installed the app sees an install
 * promotion, consistently — and a user who uninstalls must be promoted
 * again. That rules out the old "dismissed forever" flags: uninstalling a
 * PWA (and reinstalling it) does not clear localStorage for the origin, so
 * a permanent flag would silence the promotion for good.
 *
 * Instead:
 * - "Not now" SNOOZES the promotion for a bounded window (7 days); it
 *   returns afterwards.
 * - A device that was observed as installed and is later seen running in a
 *   browser tab (i.e. uninstalled) has its snooze cleared immediately, so
 *   the promotion comes back on the very next visit.
 * - `appinstalled` records the installed flag and clears any snooze.
 */
export const INSTALL_SNOOZE_DAYS = 7;
const SNOOZE_KEY = "universe-install-snooze-v1";
const INSTALLED_FLAG_KEY = "universe-install-ever-installed-v1";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // private mode: promotion simply stays visible
  }
}

/** Records that this device has been seen as an installed app. */
export function markInstallObserved(): void {
  if (typeof window === "undefined") return;
  writeStorage(INSTALLED_FLAG_KEY, "1");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True while the user's most recent "not now" is still within its window. */
export function isInstallPromotionSnoozed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = readStorage(SNOOZE_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return until > Date.now();
}

/** Hides the promotion for the snooze window ("Not now"), stored as an
 *  absolute expiry so the promotion reliably returns afterwards. */
export function snoozeInstallPromotion(days: number = INSTALL_SNOOZE_DAYS): void {
  if (typeof window === "undefined") return;
  writeStorage(SNOOZE_KEY, String(Date.now() + days * DAY_MS));
}

/**
 * Reconciles stored promotion state with the CURRENT display mode.
 * Returns true when the device appears to have been uninstalled since the
 * last visit (immersive flag set, but the page is running in a browser tab).
 */
export function reconcileInstallState(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneDisplay()) {
    markInstallObserved();
    return false;
  }
  const wasInstalled = readStorage(INSTALLED_FLAG_KEY) === "1";
  if (wasInstalled) {
    // The app was installed before and is now running in a browser tab:
    // the user uninstalled it. Forget the snooze so the promotion returns.
    writeStorage(INSTALLED_FLAG_KEY, null);
    writeStorage(SNOOZE_KEY, null);
    return true;
  }
  return false;
}

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
    markInstallObserved();
    writeStorage(SNOOZE_KEY, null); // an install ends any active snooze
    emit();
  });
}
