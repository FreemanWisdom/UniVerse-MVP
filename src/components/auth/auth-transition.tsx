"use client";

import { useEffect, useState } from "react";

/**
 * Shared Universe ICOS authentication transition overlay.
 *
 * A short, brand-consistent confirmation shown AFTER the underlying auth
 * operation has already succeeded — it never pretends authentication is
 * still in progress. Because it renders as a fixed overlay, the component
 * can be mounted from any auth flow (sign-in, sign-out, recovery) without
 * touching route structure.
 *
 * Variants:
 *  - "sign-in"   — welcome the user into the app
 *  - "sign-out"   — confirm sign-out before returning to the public site
 *  - "success"    — generic success (used by recovery flows)
 *
 * prefers-reduced-motion collapses the orbital animation (globals.css
 * already disables the keyframes) and shortens the hold so the transition
 * never becomes an artificial delay.
 */

const VARIANT_COPY: Record<string, { title: string; caption: string }> = {
  "sign-in": {
    title: "Welcome back",
    caption: "Entering Universe ICOS",
  },
  "sign-out": {
    title: "Signed out",
    caption: "See you back on campus soon",
  },
  success: {
    title: "Success",
    caption: "Universe ICOS",
  },
};

const HOLD_MS = 900;
const HOLD_MS_REDUCED = 150;

export function AuthTransition({
  variant = "success",
  title,
  caption,
  onDone,
}: {
  variant?: "sign-in" | "sign-out" | "success";
  /** Optional copy overrides (fall back to the variant defaults). */
  title?: string;
  caption?: string;
  /** Called once the short transition has finished. */
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, reduced ? HOLD_MS_REDUCED : HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  const defaults = VARIANT_COPY[variant] ?? VARIANT_COPY.success;
  const copy = { title: title ?? defaults.title, caption: caption ?? defaults.caption };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm"
    >
      {/* Mini orbit: ICOS core + two coordinated rings */}
      <div className="relative h-24 w-24" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-campus-500/20" />
        <div className="absolute inset-[18%] rounded-full border border-dashed border-white/15 uv-orbit-spin" style={{ animation: "uv-spin 8s linear infinite" }} />
        <div
          className="uv-orbit-core absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(74,222,128,0.95), rgba(22,163,74,0.65) 60%, rgba(22,163,74,0.14) 100%)",
            animation: "uv-pulse 2.4s ease-in-out infinite",
          }}
        >
          <span className="font-display text-[0.7rem] font-bold tracking-[0.08em] text-black/80">
            ICOS
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-campus-500 shadow-[0_0_12px_#22c55e]"
            aria-hidden="true"
          />
          <span className="font-display text-sm font-bold tracking-tight text-foreground">
            Universe ICOS
          </span>
        </div>
        <p className="font-display text-xl font-bold tracking-tight text-foreground">
          {copy.title}
        </p>
        <p className="text-xs text-slate-400">{copy.caption}</p>
      </div>
    </div>
  );
}
