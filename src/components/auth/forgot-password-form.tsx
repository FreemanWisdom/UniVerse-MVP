"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/**
 * Password-reset request form.
 *
 * Anti-enumeration: the outcome of Supabase's resetPasswordForEmail is never
 * reflected back in a way that reveals whether the address has an account.
 * Success shows the same generic message regardless of account existence
 * (GoTrue itself also treats unknown addresses as success), and failures
 * only surface honest transport/rate-limit guidance — never account state.
 */

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      // The link lands on /reset-password. Supabase honors the redirect target
      // only if the target is in the project's allowlist; otherwise it falls
      // back to the configured site URL, which the app also routes to
      // /reset-password (see the public home page's code forwarding).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const raw = error.message.toLowerCase();
        if (raw.includes("rate limit") || raw.includes("too many")) {
          setMessage(
            "Too many reset requests — please wait a minute and try again."
          );
        } else if (
          raw.includes("network") ||
          raw.includes("failed to fetch") ||
          raw.includes("fetch failed")
        ) {
          setMessage(
            "We couldn't reach the server. Check your connection and try again."
          );
        } else {
          // Any other failure is reported without revealing account state.
          setMessage(
            "We couldn't send the reset email just now. Please try again in a moment."
          );
        }
        return;
      }

      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-campus-500/30 bg-campus-500/10">
          <svg
            className="h-5 w-5 text-campus-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">Check your mail</h3>
          <p className="text-sm text-slate-400">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, a
            password reset link is on its way. The link expires in about an
            hour.
          </p>
          <p className="text-xs text-slate-500">
            Didn&apos;t get it? Check your spam folder, or come back and try again.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-campus-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-campus-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="reset-email" className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Email address
        </label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@campus.edu.ng"
          className="h-10"
          required
        />
      </div>

      {message ? (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300" role="alert">
          {message}
        </p>
      ) : null}

      <Button type="submit" className="w-full min-h-[36px]" disabled={isLoading}>
        {isLoading ? "Sending…" : "Send reset link"}
      </Button>

      <p className="border-t border-surface-200 pt-3 text-center text-xs text-slate-400">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-campus-400 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
