"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthTransition } from "@/components/auth/auth-transition";
import { createClient } from "@/lib/supabase/client";

/** Map known Supabase Auth failures to plain, human messages. */
function friendlyLoginError(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes("invalid login credentials")) {
    return "That email and password don't match. Check both and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Your email isn't confirmed yet — check your inbox for the confirmation link first.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts in a short time. Please wait a minute and try again.";
  }
  if (message.includes("network") || message.includes("failed to fetch") || message.includes("fetch failed")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  return "Unable to sign in. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  const enterApp = () => {
    router.push("/orbit");
    router.refresh();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // Authentication already succeeded — the overlay is a brief brand
      // moment, never a fake "still signing in" state.
      if (data.session) {
        setShowTransition(true);
      } else {
        router.push("/orbit");
        router.refresh();
      }
    } catch (submitError) {
      const raw =
        submitError instanceof Error ? submitError.message : "";
      setError(friendlyLoginError(raw));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@campus.edu.ng"
          className="h-10"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          className="h-10"
          required
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Link
          href="/forgot-password"
          className="text-xs text-slate-400 transition-colors hover:text-campus-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-sm"
        >
          Forgotten password?
        </Link>
      </div>

      <Button type="submit" className="w-full min-h-[36px]" disabled={isLoading}>
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>

      {showTransition ? <AuthTransition variant="sign-in" onDone={enterApp} /> : null}
    </form>
  );
}
