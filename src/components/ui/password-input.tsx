"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, "type"> & {
  /** Hidden by default; the toggle flips it. */
  showByDefault?: boolean;
};

/**
 * Password field with a preview toggle. Forwards every Input prop, so it can
 * drop into any existing form unchanged.
 */
export function PasswordInput({ showByDefault = false, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(showByDefault);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className ?? ""} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        tabIndex={0}
      >
        {visible ? (
          // eye-off: eye with a slash — password currently shown, click to hide
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // eye: password currently hidden, click to preview
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
