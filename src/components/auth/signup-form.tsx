"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";

interface SchoolOption {
  id: string;
  name: string;
  slug: string;
}

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [schoolsError, setSchoolsError] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: fnError } = await supabase.functions.invoke<SchoolOption[] | { schools: SchoolOption[] }>(
          "verify-student-public",
          { method: "GET" }
        );
        if (cancelled) return;
        if (fnError) throw fnError;
        const list = Array.isArray(data) ? data : data?.schools ?? [];
        setSchools(list);
      } catch {
        if (!cancelled) setSchoolsError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const chosen = schools.find((school) => school.id === schoolId);
      if (!chosen) {
        throw new Error("Please select your school before creating your account.");
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: chosen ? { university: chosen.name } : undefined,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.push("/verify");
        router.refresh();
        return;
      }
      setAccountCreated(true);
    } catch (submitError) {
      const raw =
        submitError instanceof Error
          ? submitError.message
          : typeof submitError === "object" && submitError !== null
            ? JSON.stringify(submitError)
            : "";
      const message =
        /[a-z]{3}/i.test(raw) && !raw.trim().startsWith("{")
          ? raw
          : "We couldn't create your account just now. Check your details and try again in a moment.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (accountCreated) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto h-11 w-11 rounded-full bg-campus-500/10 border border-campus-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-campus-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">Check your mail</h3>
          <p className="text-sm text-slate-400">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.
            Confirm it, then sign in to continue.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-campus-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-campus-700"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-medium text-slate-200">
          Email address
        </label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@campus.edu.ng"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a secure password"
          minLength={8}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-school" className="text-sm font-medium text-slate-200">
          Your school <span className="text-slate-400 font-normal">(required — sets your campus)</span>
        </label>
        {schoolsError ? (
          <div className="space-y-2 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2.5 text-xs text-slate-400">
            <p>Couldn&apos;t load the school list — your school is required to create an account.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-campus-400 hover:text-campus-300"
            >
              Try again
            </button>
          </div>
        ) : (
          <select
            id="signup-school"
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            required
            className="flex w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
          >
            <option value="" disabled>
              {schools.length === 0 ? "Loading schools…" : "Select your school"}
            </option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={isLoading} className="w-full bg-campus-600 hover:bg-campus-700 text-white">
        {isLoading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
