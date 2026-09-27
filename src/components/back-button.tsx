"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface BackButtonProps {
  href: string;
  label: string;
  className?: string;
}

/**
 * A clearly visible back button for sub-pages. Rendered as a bordered
 * outline button so navigation back is always discoverable on mobile.
 */
export function BackButton({ href, label, className }: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-fit items-center justify-center rounded-lg border border-surface-300 bg-surface-50 px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500",
        className
      )}
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
        className="mr-1 h-4 w-4"
        aria-hidden="true"
      >
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
      {label}
    </Link>
  );
}
