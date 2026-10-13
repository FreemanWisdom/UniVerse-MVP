"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { SchoolCombobox, SchoolOption } from "./school-combobox";

interface FieldErrors {
  full_name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  school?: string;
}

/** Supabase sends a 6-digit confirmation code (mailer_otp_length). */
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

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
  // Supabase phrases its email-send rate limit differently — double-clicking
  // "Create account" is the usual trigger.
  if (message.includes("for security purposes") || message.includes("over_email_send_rate_limit")) {
    return {
      message:
        "Your account was created — please wait a minute, then check your inbox before trying again.",
    };
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

/** Map verifyOtp failures onto plain-language guidance. */
function mapVerifyError(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts — wait a minute and try again.";
  }
  if (message.includes("network") || message.includes("failed to fetch") || message.includes("fetch failed")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  // Supabase returns "Invalid activation token" / "Token has expired or is invalid"
  // for wrong or already-used codes — both mean "check your email and retry".
  return "That code isn't right. Check the latest email and try again.";
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

  // Code-verification state (shown on the "Check your mail" screen).
  const [verificationCode, setVerificationCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const codeInputRef = useRef<HTMLInputElement>(null);

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

  // Focus the code input as soon as the verification screen appears.
  useEffect(() => {
    if (accountCreated) codeInputRef.current?.focus();
  }, [accountCreated]);

  // Tick the resend cooldown down once per second.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
          // Clicking the confirmation link in the email lands on the callback
          // route, which finishes the sign-in. The 6-digit code in the email
          // is the primary path and is entered right here.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/verify`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.push("/orbit"); // like every other confirmed path (login, email-link callback)
        router.refresh();
        return;
      }
      // GoTrue answers an already-registered, confirmed address with a
      // fake user whose identities list is empty and sends NO email
      // (anti-enumeration). Waiting for a code here would hang forever,
      // so point the person at sign-in / reset instead.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setFieldErrors({
          email:
            "This email already has a UniVerse account. Sign in instead, or use “Forgot password” if you can’t remember it.",
        });
        return;
      }
      // Session withheld — the account exists but awaits the 6-digit code
      // (or the email link). Switch to the verification screen.
      setAccountCreated(true);
    } catch (submitError) {
      const raw =
        submitError instanceof Error ? submitError.message : "";
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

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = verificationCode.trim();
    setCodeError(null);

    if (token.length !== CODE_LENGTH || !/^\d+$/.test(token)) {
      setCodeError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }

    setIsVerifying(true);
    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        type: "signup",
        email,
        token,
      });
      if (verifyError) throw verifyError;
      if (!data.session) throw new Error("no session");

      // Email confirmed — the account is now verified, and this is treated
      // exactly like a confirmed signup: straight into the app.
      router.push("/orbit"); // like every other confirmed path (login, email-link callback)
      router.refresh();
    } catch (error) {
      setCodeError(
        mapVerifyError(error instanceof Error ? error.message : "")
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setResendNote(null);
    setCodeError(null);
    setIsResending(true);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) throw resendError;
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendNote("New code sent — check your inbox (and spam folder).");
    } catch (error) {
      const raw = error instanceof Error ? error.message.toLowerCase() : "";
      if (raw.includes("rate limit") || raw.includes("too many")) {
        setResendNote("Too many requests — please wait a minute and try again.");
      } else {
        setResendNote("We couldn't send a new code just now. Please try again.");
      }
    } finally {
      setIsResending(false);
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
            aria-hidden="true"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">Check your mail</h3>
          <p className="text-sm text-slate-400">
            We sent a {CODE_LENGTH}-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>. Enter it
            below to activate your account.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-3 text-left">
          <div className="space-y-1.5">
            <label
              htmlFor="signup-code"
              className="text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              Verification code
            </label>
            <Input
              ref={codeInputRef}
              id="signup-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(event.target.value.replace(/[^\d]/g, "").slice(0, CODE_LENGTH))
              }
              placeholder="••••••••"
              className="h-10 text-center text-lg tracking-[0.35em]"
              maxLength={CODE_LENGTH}
              aria-invalid={Boolean(codeError) || undefined}
              disabled={isVerifying}
              required
            />
            {codeError && (
              <p className="text-xs text-red-400" role="alert">
                {codeError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isVerifying || verificationCode.length < CODE_LENGTH}
            className="w-full min-h-[36px] bg-campus-600 text-white hover:bg-campus-700"
          >
            {isVerifying ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>

        <div className="space-y-1">
          {resendCooldown > 0 ? (
            <p className="text-xs text-slate-500">
              Didn&apos;t get it? You can request a new code in {resendCooldown}s.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-xs font-medium text-campus-400 transition-colors hover:text-campus-300 disabled:opacity-50"
            >
              {isResending ? "Sending…" : "Send a new code"}
            </button>
          )}
          {resendNote && (
            <p className="text-xs text-slate-400" role="status">
              {resendNote}
            </p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          The confirmation link in the email works too — it signs you in
          directly. Codes expire after one hour.
        </p>
        <p className="text-xs text-slate-500">
          Wrong email?{" "}
          <button
            type="button"
            onClick={() => {
              setAccountCreated(false);
              setVerificationCode("");
              setCodeError(null);
            }}
            className="font-medium text-campus-400 hover:text-campus-300"
          >
            Start over
          </button>
        </p>
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
