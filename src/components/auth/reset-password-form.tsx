"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthTransition } from "@/components/auth/auth-transition";
import { createClient } from "@/lib/supabase/client";

/**
 * New-password form for the recovery flow.
 *
 * Recovery links arrive in several shapes depending on how Supabase sends
 * them (PKCE code, token hash, or legacy token):
 *
 *  - /reset-password?code=…                     → PKCE code exchange
 *  - /reset-password?token_hash=…&type=recovery → OTP verification
 *  - …#access_token=…&refresh_token=…           → tokens read from the
 *    URL hash and installed via setSession (the SSR client uses the PKCE
 *    flow type, which by design refuses to auto-consume implicit hash
 *    tokens)
 *
 * Anything else — including expired or already-used links — lands on a
 * friendly "invalid link" state that offers to send a new one. Supabase
 * Auth remains the identity authority: passwords are only ever sent to
 * auth.updateUser and are never stored in application tables.
 */

type Stage = "checking" | "ready" | "invalid" | "submitting" | "done";

export function ResetPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useRef(false);

  useEffect(() => {
    if (run.current) return;
    run.current = true;

    const supabase = createClient();

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      const hasSession = async () => {
        const { data } = await supabase.auth.getSession();
        return Boolean(data.session);
      };

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (!exchangeError && (await hasSession())) {
            setStage("ready");
            return;
          }
        } else if (tokenHash && type === "recovery") {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (!otpError && (await hasSession())) {
            setStage("ready");
            return;
          }
        } else {
          // Hash-style links carry the recovery tokens in the URL fragment.
          const hash = window.location.hash.replace(/^#/, "");
          const fragment = new URLSearchParams(hash);
          const accessToken = fragment.get("access_token");
          const refreshToken = fragment.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setError && (await hasSession())) {
              setStage("ready");
              return;
            }
          } else if (await hasSession()) {
            // Session already established in this browser.
            setStage("ready");
            return;
          }
        }

        setStage("invalid");
      } catch {
        setStage("invalid");
      }
    })();
  }, []);

  const handleDone = useCallback(async () => {
    // The recovery session has served its purpose; end it cleanly so the
    // user re-authenticates with their new password.
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Sign-out best effort — the new password is already saved.
    }
    router.push("/login");
    router.refresh();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStage("submitting");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        const raw = updateError.message.toLowerCase();
        if (raw.includes("at least") || raw.includes("weak") || raw.includes("short")) {
          setError("Password must be at least 8 characters.");
        } else if (raw.includes("rate limit") || raw.includes("too many")) {
          setError("Too many attempts — please wait a moment and try again.");
        } else {
          setError("We couldn't update your password. Please try again.");
        }
        setStage("ready");
        return;
      }

      setStage("done");
    } catch {
      setError("We couldn't update your password. Please try again.");
      setStage("ready");
    }
  };

  if (stage === "done") {
    return <AuthTransition variant="success" title="Password updated" onDone={handleDone} />;
  }

  if (stage === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-campus-500/30 border-t-campus-500"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-400">Checking your reset link…</p>
      </div>
    );
  }

  if (stage === "invalid") {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-red-800 bg-red-950/40">
          <svg
            className="h-5 w-5 text-red-300"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">
            This reset link has expired or is invalid
          </h3>
          <p className="text-sm text-slate-400">
            Reset links only work once and expire after about an hour. Request
            a fresh link to continue.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="block w-full rounded-lg bg-campus-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-campus-700"
        >
          Request a new reset link
        </Link>
        <p className="text-xs text-slate-500">
          Already sorted it?{" "}
          <Link href="/login" className="text-campus-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 text-center">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Set a new password
        </h2>
        <p className="text-sm text-slate-400">
          Choose a new password for your Universe ICOS account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
            New password
          </label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="h-10"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your new password"
            className="h-10"
            required
            minLength={8}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full min-h-[36px]"
          disabled={stage === "submitting"}
        >
          {stage === "submitting" ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
