"use client";

import { useEffect } from "react";
import { IconX, IconBed, IconCar, IconSparkle } from "@/components/icons";

const BETA_FEATURES = [
  {
    icon: IconBed,
    name: "Lodge Finder",
    description: "Discover lodges and off-campus housing near your school.",
    badge: "BETA",
    live: true,
  },
  {
    icon: IconCar,
    name: "Errand Hub",
    description: "Post and accept errands across campus.",
    badge: "BETA",
    live: true,
  },
  {
    icon: IconSparkle,
    name: "Skill Place",
    description: "Offer your skills and find student talent.",
    badge: "COMING LATER",
    live: false,
  },
];

/**
 * "Future ICOS Experiences" — early-beta features that exist in the backend
 * (inserts work via the legacy data model) but don't have full student UI
 * pages in this V1.0 build. Informational only; nothing to navigate to yet.
 */
export function FutureIcosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Future ICOS Experiences"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-surface-200 bg-surface-100 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Future ICOS Experiences
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
          These aren&apos;t part of the V1.0 core experience yet, but they&apos;re live and
          working as an early beta.
        </p>

        <div className="mt-4 space-y-2.5">
          {BETA_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.name}
                className={
                  f.live
                    ? "flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-100/60 p-3.5"
                    : "flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-100/40 p-3.5 opacity-60"
                }
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-300 bg-surface-200 text-campus-400">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{f.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-400">
                    {f.description}
                  </p>
                </div>
                <span
                  className={
                    f.live
                      ? "shrink-0 rounded-full bg-campus-500 px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-black"
                      : "shrink-0 rounded-full bg-surface-300 px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-slate-300"
                  }
                >
                  {f.badge}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
