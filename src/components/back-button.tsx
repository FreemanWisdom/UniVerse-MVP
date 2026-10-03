"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface BackButtonProps {
  /** Fallback destination when there is no in-app history to go back to. */
  href: string;
  /** Used as the accessible name (aria-label + tooltip) — not rendered as text. */
  label: string;
  className?: string;
}

/**
 * Arrow-only back button for sub-pages: icon affordance, accessible label,
 * 36px touch target, tooltip on hover.
 *
 * History-aware: if the user arrived here through in-app navigation
 * (AppHistoryTracker keeps a per-tab depth counter), go back one step so
 * e.g. a profile opened from Chat returns to Chat — not to the button's
 * fallback section. Direct visits (fresh deep link, no in-app history)
 * use the provided href instead.
 */
export function BackButton({ href, label, className }: BackButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    let depth = 0;
    try {
      depth = parseInt(window.sessionStorage.getItem("universe-nav-depth") || "0", 10);
    } catch {
      /* private mode */
    }
    if (depth > 1) {
      router.back();
    } else {
      router.push(href);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-300 bg-surface-50 text-foreground transition-colors hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
        aria-hidden="true"
      >
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
    </Link>
  );
}
