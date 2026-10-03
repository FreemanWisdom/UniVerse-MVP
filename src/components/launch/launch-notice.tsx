"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { findLaunchSchool, WAITLIST_URL } from "@/lib/launch";
import { IconX } from "@/components/icons";

function launchCopy(university: string | null | undefined) {
  const launch = findLaunchSchool(university);
  if (launch) {
    return {
      title: `UniVerse is launching at ${launch.label} soon!`,
      body: "You're in early — the full launch on your campus is right around the corner. Join the waitlist for early access and to be first to know when we go live.",
    };
  }
  return {
    title: "UniVerse is launching soon",
    body: "We're kicking off at our first campuses and growing from there. Join the waitlist and we'll let you know the moment we go live at yours.",
  };
}

/**
 * "Launching soon + join the waitlist" notice shown right after signup
 * (on the check-your-mail screen), personalized when the student picked a
 * launch campus.
 */
export function LaunchNotice({ university }: { university?: string | null }) {
  const { title, body } = launchCopy(university);

  return (
    <div
      className="rounded-xl border border-campus-500/25 bg-campus-500/5 p-4 text-left"
      data-testid="launch-notice"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{body}</p>
      <a
        href={WAITLIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-[36px] items-center rounded-lg bg-campus-500 px-3.5 py-2 text-xs font-bold text-black transition-colors hover:bg-campus-400"
      >
        Join the waitlist
      </a>
    </div>
  );
}

const DISMISS_KEY = "universe-launch-waitlist-dismissed";

/**
 * Dismissible banner for students already inside the app, shown once per
 * device until dismissed. Covers everyone who signed up before the
 * signup-screen notice existed.
 */
export function LaunchWaitlistBanner({ university }: { university?: string | null }) {
  const [open, setOpen] = useState(false);
  const { title, body } = launchCopy(university);

  useEffect(() => {
    // Deferred: synchronous setState in the effect body trips the
    // cascading-render lint rule (same as EnvironmentBadge).
    const id = window.setTimeout(() => {
      try {
        setOpen(window.localStorage.getItem(DISMISS_KEY) !== "1");
      } catch {
        // Private mode etc. — don't show repeatedly if we can't persist.
        setOpen(false);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore — banner simply won't persist */
    }
  };

  return (
    <div
      className="mx-auto w-full max-w-7xl px-2 pt-3 sm:px-4"
      data-testid="launch-banner"
    >
      <div className="flex items-start gap-3 rounded-xl border border-campus-500/25 bg-campus-500/5 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{body}</p>
          <a
            href={WAITLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex min-h-[36px] items-center rounded-lg bg-campus-500 px-3.5 py-2 text-xs font-bold text-black transition-colors hover:bg-campus-400"
          >
            Join the waitlist
          </a>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss launch notice"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-surface-200 hover:text-foreground"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
