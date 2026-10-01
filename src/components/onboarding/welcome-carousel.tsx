"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * First-launch onboarding walkthrough.
 *
 * Shown once per device on the first authenticated visit (Phase 6 install/
 * onboarding experience). A swipeable carousel of core features with dots,
 * Skip, and keyboard navigation. Dismissal (finish or skip) sets a
 * localStorage flag — deliberately NOT stored in the database: it is a
 * per-device presentation preference, not user data (data minimization,
 * no speculative backend contract). Settings offers a "Replay intro" that
 * clears the flag.
 */

const STORAGE_KEY = "universe-onboarding-v1";

type Slide = {
  icon: string;
  title: string;
  body: string;
  detail?: string;
};

const SLIDES: Slide[] = [
  {
    icon: "🎓",
    title: "Welcome to your campus",
    body: "UniVerse ICOS is your school's own social hub — every feed, chat, and study group here is scoped to your university.",
    detail: "Only students from your school can see what happens here.",
  },
  {
    icon: "🪐",
    title: "Orbit — the campus feed",
    body: "Share what's happening on campus. Posts, likes, and comments stay inside your school.",
    detail: "From your Orbit you can also reach Chat, Whisper, and Study.",
  },
  {
    icon: "🤫",
    title: "Whisper — stay anonymous",
    body: "Confess, vent, or share without a name. Whisper never shows who you are — not even to admins.",
  },
  {
    icon: "📚",
    title: "Study — pass together",
    body: "Find course materials, join study tribes, and ask the AI Tutor when you're stuck at 2am.",
    detail: "Uploads are checked by moderators, so resources stay safe.",
  },
  {
    icon: "🚀",
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
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSlide(SLIDES[0]);
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode etc.) — skip onboarding.
    }
  }, []);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // Best-effort: even without storage, close the overlay for this session.
    }
    setVisible(false);
    setIndex(0);
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
      aria-label="Welcome to UniVerse ICOS"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-background/90 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-surface-200 bg-surface-50 shadow-2xl sm:rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="font-display text-sm font-bold tracking-tight text-foreground">
              UniVerse
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
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-200 text-4xl">
            {slide.icon}
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
