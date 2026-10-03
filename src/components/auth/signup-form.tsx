"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { SchoolCombobox, SchoolOption } from "./school-combobox";
import { LaunchNotice } from "@/components/launch/launch-notice";

interface FieldErrors {
  full_name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  school?: string;
}

/**
 * Map known Supabase/trigger signup failures onto the form field they belong
 * to, in plain language. Unknown failures fall back to a general message.
 */
function mapSignupError(raw: string): { field?: keyof FieldErrors; message: string } {
  const message = raw.toLowerCase();
  if (message.includes("user already registered")) {
    return {
      field: "email",
      message: "An account with this email already exists — try signing in instead.",
    };
  }
  if (message.includes("password should be at least") || message.includes("password too short")) {
    return { field: "password", message: "Password must be at least 8 characters." };
  }
  if (message.includes("valid student email")) {
    return { field: "email", message: "Enter a valid email address." };
  }
  if (message.includes("please select your university")) {
    return { field: "school", message: "Select your school to continue." };
  }
  if (message.includes("selected university is unavailable")) {
    return {
      field: "school",
      message: "That school isn't available yet — pick the closest campus from the list.",
    };
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return { message: "Too many attempts — please wait a minute and try again." };
  }
  if (message.includes("network") || message.includes("failed to fetch") || message.includes("fetch failed")) {
    return { message: "We couldn't reach the server. Check your connection and try again." };
  }
  if (message.includes("database error")) {
    return {
      message: "We couldn't create your account just now. Please try again in a moment.",
    };
  }
  return { message: "We couldn't create your account just now. Check your details and try again." };
}

export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [schoolsError, setSchoolsError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: fnError } = await supabase.functions.invoke<
          SchoolOption[] | { schools: SchoolOption[] }
        >("verify-student-public", { method: "GET" });
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

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.full_name = "Enter your full name.";
    if (!password) errors.password = "Create a password of at least 8 characters.";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (confirmPassword !== password) errors.confirm = "Passwords don't match.";
    if (!selectedSchool) errors.school = "Select your school to continue.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    if (!validate() || !selectedSchool) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const school = selectedSchool;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            university: school.name,
          },
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
      const raw = submitError instanceof Error ? submitError.message : "";
      const { field, message } = mapSignupError(raw);
      if (field) {
        setFieldErrors((prev) => ({ ...prev, [field]: message }));
      } else {
        setGeneralError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (accountCreated) {
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
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">Check your mail</h3>
          <p className="text-sm text-slate-400">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Confirm it,
            then sign in to continue.
          </p>
          <p className="text-xs text-slate-500">
            If this email already has an account, nothing new was created — just
            sign in.
          </p>
        </div>
        <LaunchNotice university={selectedSchool?.name ?? null} />
        <Link
          href="/login"
          className="block w-full rounded-lg bg-campus-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-campus-700"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Full name
        </label>
        <Input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="e.g. Ada Obi"
          className="h-10"
          aria-invalid={Boolean(fieldErrors.full_name) || undefined}
          required
        />
        {fieldErrors.full_name && (
          <p className="text-xs text-red-400" role="alert">{fieldErrors.full_name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Email address
        </label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@campus.edu.ng"
          className="h-10"
          aria-invalid={Boolean(fieldErrors.email) || undefined}
          required
        />
        {fieldErrors.email && (
          <p className="text-xs text-red-400" role="alert">{fieldErrors.email}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Password
          </label>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="h-10"
            minLength={8}
            aria-invalid={Boolean(fieldErrors.password) || undefined}
            required
          />
          {fieldErrors.password && (
            <p className="text-xs text-red-400" role="alert">{fieldErrors.password}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirm" className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Confirm password
          </label>
          <PasswordInput
            id="signup-confirm"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            className="h-10"
            aria-invalid={Boolean(fieldErrors.confirm) || undefined}
            required
          />
          {fieldErrors.confirm && (
            <p className="text-xs text-red-400" role="alert">{fieldErrors.confirm}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="signup-school" className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Your school <span className="font-normal normal-case tracking-normal text-slate-500">(required — sets your campus)</span>
        </label>
        {schoolsError ? (
          <div className="space-y-1.5 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2.5 text-xs text-slate-400">
            <p>Couldn&apos;t load the school list — your school is required to create an account.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="font-medium text-campus-400 hover:text-campus-300"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <SchoolCombobox
              schools={schools}
              selected={selectedSchool}
              onSelect={setSelectedSchool}
              invalid={Boolean(fieldErrors.school)}
            />
            {fieldErrors.school && (
              <p className="text-xs text-red-400" role="alert">{fieldErrors.school}</p>
            )}
          </>
        )}
      </div>

      {generalError ? (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300" role="alert">
          {generalError}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full min-h-[36px] bg-campus-600 text-white hover:bg-campus-700"
      >
        {isLoading ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-[11px] text-slate-500">
        Email confirmation is required before your first sign-in. Verification is
        optional and never blocks campus features.
      </p>
    </form>
  );
}
