"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconGraduationCap,
  IconPlanet,
  IconWhisper,
  IconBooks,
  IconRocket,
} from "@/components/icons";

/**
 * First-launch onboarding walkthrough (VERSIONED).
 *
 * The tour carries a version number. A user sees the tour whenever their
 * last COMPLETED tour version is lower than the current one:
 *
 *   - never seen anything → show
 *   - completed v1 (legacy "universe-onboarding-v1" flag) → show v2
 *   - completed v2 → do not show again
 *   - refresh / logout+login → state persists, no re-show
 *   - new account → show
 *
 * State lives in localStorage under `universe-tour-version` (value = highest
 * completed version as a string). The legacy v1 key is honored as "version 1
 * completed" so every existing user gets the v2 tour exactly once.
 * Deliberately NOT stored in the database: presentation preference, not user
 * data (data minimization, no speculative backend contract). Settings offers
 * a "Replay intro" that clears the version key.
 */

const CURRENT_TOUR_VERSION = 2;
const VERSION_KEY = "universe-tour-version";
const LEGACY_V1_KEY = "universe-onboarding-v1";

/** Highest tour version this device has completed (0 = never). */
function getCompletedTourVersion(): number {
  try {
    const stored = window.localStorage.getItem(VERSION_KEY);
    if (stored !== null) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    if (window.localStorage.getItem(LEGACY_V1_KEY) !== null) return 1;
  } catch {
    // localStorage unavailable (private mode etc.) — treat as already seen
    // so the tour never nags on every visit; it can still be replayed from
    // Settings for the current session.
    return CURRENT_TOUR_VERSION;
  }
  return 0;
}

type Slide = {
  icon: (p: React.SVGProps<SVGSVGElement> & { size?: number }) => React.JSX.Element;
  title: string;
  body: string;
  detail?: string;
};

const SLIDES: Slide[] = [
  {
    icon: IconGraduationCap,
    title: "Welcome to your campus",
    body: "Universe ICOS is your school's own social hub — every feed, chat, and study group here is scoped to your university.",
    detail: "Only students from your school can see what happens here.",
  },
  {
    icon: IconPlanet,
    title: "Orbit — the campus feed",
    body: "Share what's happening on campus. Posts, likes, and comments stay inside your school.",
    detail: "From your Orbit you can also reach Chat, Whisper, and Study.",
  },
  {
    icon: IconWhisper,
    title: "Whisper — stay anonymous",
    body: "Confess, vent, or share under an anonymous label. Other students never see your name or profile on a Whisper.",
    detail: "Your likes and reports are linked to your account so moderators can keep the space safe and remove rule-breaking posts.",
  },
  {
    icon: IconBooks,
    title: "Study — pass together",
    body: "Find course materials, join study tribes, and ask the AI Tutor when you're stuck at 2am.",
    detail: "Uploads are checked by moderators, so resources stay safe.",
  },
  {
    icon: IconRocket,
    title: "You're all set",
    body: "Your campus is waiting. You can replay this intro anytime from Settings.",
  },
];

export function WelcomeCarousel() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [slide, setSlide] = useState<Slide | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Hydration-safe reveal: only decide after mount so server and client
  // render the same (hidden) markup first.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (getCompletedTourVersion() < CURRENT_TOUR_VERSION) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlide(SLIDES[0]);
      setVisible(true);
    }
  }, []);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(VERSION_KEY, String(CURRENT_TOUR_VERSION));
    } catch {
      // Best-effort: even without storage, close the overlay for this session.
    }
    setVisible(false);
    setIndex(0);
    // Let the post-tour install invitation (and any future post-tour step)
    // know the tour just completed.
    window.dispatchEvent(new Event("universe:tour-completed"));
  }, []);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      setIndex(clamped);
      setSlide(SLIDES[clamped]);
    },
    []
  );

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, index, go, finish]);

  if (!visible || !slide) return null;

  const isLast = index === SLIDES.length - 1;
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    const endX = e.changedTouches[0]?.clientX;
    if (startX == null || endX == null) return;
    const dx = endX - startX;
    if (dx < -40) go(index + 1); // swipe left → next
    if (dx > 40) go(index - 1); // swipe right → previous
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Universe ICOS"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-background/90 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-surface-200 bg-surface-50 shadow-2xl sm:rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="font-display text-sm font-bold tracking-tight text-foreground">
              Universe ICOS
            </span>
          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
            >
              Skip
            </button>
          )}
        </div>

        {/* Slide */}
        <div
          key={index}
          aria-live="polite"
          className="flex flex-col items-center px-8 pb-2 pt-8 text-center sm:pt-10"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-200 text-campus-300">
            {(() => {
              const SlideIcon = slide.icon;
              return <SlideIcon size={34} />;
            })()}
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">
            {slide.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{slide.body}</p>
          {slide.detail && (
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{slide.detail}</p>
          )}
        </div>

        <div className="flex h-2 items-center justify-center gap-2 py-4">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 ${
                i === index ? "w-6 bg-campus-500" : "w-2 bg-surface-300 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-surface-200 px-5 py-4">
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="flex h-10 items-center rounded-lg border border-surface-300 bg-surface-50 px-4 text-sm font-medium text-slate-300 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? finish : () => go(index + 1)}
            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-campus-500 px-4 text-sm font-semibold text-background transition-colors hover:bg-campus-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
