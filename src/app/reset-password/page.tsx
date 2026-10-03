import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};

/**
 * Password-reset destination.
 *
 * Lives OUTSIDE the (auth) route group on purpose: the (auth) layout
 * redirects authenticated users into the app, but a recovery link grants
 * a short-lived authenticated session that must stay here to set a new
 * password. This page renders standalone with the same visual language
 * as the other auth screens.
 */
export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.07),transparent_70%)]"
      />

      <div className="relative w-full max-w-md space-y-5">
        <div className="flex flex-col items-center text-center">
          <span
            className="h-2.5 w-2.5 rounded-full bg-campus-500 shadow-[0_0_12px_#22c55e]"
            aria-hidden="true"
          />
          <span className="mt-1 font-display text-lg font-bold tracking-tight text-foreground">
            Universe ICOS
          </span>
          <p className="mt-0.5 font-display text-[0.6rem] font-bold uppercase tracking-[0.25em] text-campus-400">
            Password recovery
          </p>
        </div>

        <main className="rounded-lg border border-surface-200 bg-surface-100/90 p-6 shadow-lg backdrop-blur-sm">
          <ResetPasswordForm />
        </main>

        <p className="text-center text-xs text-slate-500">
          <Link href="/" className="transition-colors hover:text-campus-400">
            ← Return to Universe ICOS home
          </Link>
        </p>
      </div>
    </div>
  );
}
