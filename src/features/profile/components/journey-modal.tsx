"use client";

import { useEffect } from "react";
import { IconX } from "@/components/icons";

const VERSIONS = [
  {
    tag: "V1.0 – THE FOUNDATION – SEPT 1, 2026",
    title: "Orbit • Campus Chat • Study Tribes • Study Hub • AI Tutor • Campus Whisper",
    caption: "Connect. Learn. Communicate. Contribute.",
    current: true,
  },
  {
    tag: "V2.0 – STUDENT ECONOMY",
    title: "Skill Place • Marketplace • Lodge Finder • Errand Hub",
    caption: "Earn, trade, and find your space on campus.",
    current: false,
  },
  {
    tag: "V3.0 – CAMPUS INFRASTRUCTURE",
    title: "Transport • Student Wallet • Institutional Payments • Campus Services",
    caption: "Everyday campus life, handled in one place.",
    current: false,
  },
  {
    tag: "V4.0 – NATIONAL NETWORK",
    title: "Expansion across Nigerian universities.",
    caption: "One account, every campus in the country.",
    current: false,
  },
  {
    tag: "V5.0 – AFRICAN NETWORK",
    title: "A connected African student ecosystem.",
    caption: "From Nsukka to the whole continent.",
    current: false,
  },
];

/**
 * "The UniVerse Journey" — product roadmap modal (static content, no backend).
 */
export function JourneyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="The UniVerse Journey"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-surface-200 bg-surface-100 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            The UniVerse Journey
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-surface-300 text-slate-300 transition-colors hover:bg-surface-200"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          UniVerse ICOS V1.0 is the beginning, not the whole vision. Here&apos;s where it&apos;s headed.
        </p>

        <div className="mt-4 space-y-2.5">
          {VERSIONS.map((v) => (
            <div
              key={v.tag}
              className={
                v.current
                  ? "rounded-xl border border-campus-500/60 bg-campus-950/40 p-3.5"
                  : "rounded-xl border border-surface-200 bg-surface-100/60 p-3.5"
              }
            >
              <p
                className={
                  v.current
                    ? "text-[0.65rem] font-bold uppercase tracking-[0.15em] text-campus-400"
                    : "text-[0.65rem] font-bold uppercase tracking-[0.15em] text-slate-400"
                }
              >
                {v.tag}
              </p>
              <p
                className={
                  v.current
                    ? "mt-1.5 text-sm font-semibold leading-snug text-foreground"
                    : "mt-1.5 text-sm leading-snug text-slate-300"
                }
              >
                {v.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{v.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
