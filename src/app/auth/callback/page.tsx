"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Email-link landing route.
 *
 * Confirmation links in the signup email redirect here with a PKCE `code`
 * (when the link is opened in the same browser that started the signup) —
 * this page exchanges it for a session and sends the student onward.
 *
 * When the link is opened on another device the code can't be exchanged
 * (the PKCE verifier lives in the original browser), but the email IS
 * confirmed at that point — so the failure state points at sign-in instead
 * of implying the confirmation failed.
 */

type Stage = "exchanging" | "ready" | "invalid";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  // No `code` param at all is a dead link — decide that before the effect
  // runs so no synchronous setState is needed inside it.
  const [stage, setStage] = useState<Stage>(() =>
    params.get("code") ? "exchanging" : "invalid"
  );
  const run = useRef(false);

  useEffect(() => {
    if (run.current) return;
    run.current = true;

    const code = params.get("code");
    // Only ever route to internal, non-protocol-relative paths.
    const nextRaw = params.get("next") ?? "";
    const next =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/orbit";

    if (!code) return;

    (async () => {
      try {
        const supabase = createClient();
        // The browser client auto-consumes ?code= on init and codes are
        // single-use, so a manual exchange can lose that race. Accept the
        // automatic exchange's session first; exchange manually only if
        // none appears.
        let signedIn = false;
        for (let i = 0; i < 12 && !signedIn; i++) {
          const { data } = await supabase.auth.getSession();
          signedIn = Boolean(data.session);
          if (!signedIn) await new Promise((r) => setTimeout(r, 250));
        }
        if (!signedIn) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // Email-link confirmations (new signups) also earn a welcome email;
        // the route is idempotent (atomic claim + new-account guard) so
        // existing users are unaffected. Fire-and-forget.
        void fetch("/api/welcome-email", { method: "POST" }).catch(() => undefined);
        router.replace(next);
        router.refresh();
      } catch {
        // Expired, already-used, or opened on another device. If the email
        // was confirmed, a plain sign-in works — say so instead of failing
        // opaquely.
        setStage("invalid");
      }
    })();
  }, [params, router]);

  if (stage === "exchanging") {
    return (
      <p className="py-2 text-center text-sm text-slate-400">
        Finishing your sign-in…
      </p>
    );
  }

  return (
    <div className="space-y-3 py-2 text-center">
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
      <h3 className="text-sm font-semibold text-foreground">
        This link has expired
      </h3>
      <p className="text-sm text-slate-400">
        Email links only work once, and only in the browser you signed up in.
        If you already confirmed your email, just sign in — you&apos;re all set.
      </p>
      <Link
        href="/login"
        className="block w-full rounded-lg bg-campus-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-campus-700"
      >
        Go to sign in
      </Link>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <div className="w-full rounded-2xl border border-surface-300 bg-surface-100 p-6 shadow-lg">
        <Suspense
          fallback={
            <p className="py-2 text-center text-sm text-slate-400">
              Finishing your sign-in…
            </p>
          }
        >
          <CallbackInner />
        </Suspense>
      </div>
    </div>
  );
}
