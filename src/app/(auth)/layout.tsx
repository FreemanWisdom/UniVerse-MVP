import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isAuthenticated()) {
    redirect("/orbit");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      {/* Atmospheric backdrop — static, no animation (reduced-motion safe). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.07),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_100%,rgba(15,23,42,0.5),transparent_70%)]"
      />

      <div className="relative w-full max-w-md space-y-5">
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
          >
            <span
              className="h-2.5 w-2.5 rounded-full bg-campus-500 shadow-[0_0_12px_#22c55e]"
              aria-hidden="true"
            />
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              UniVerse
            </span>
          </Link>
          <p className="mt-1 font-display text-[0.6rem] font-bold uppercase tracking-[0.25em] text-campus-400">
            Integrated Campus Operating System
          </p>
        </div>

        <main className="rounded-lg border border-surface-200 bg-surface-100/90 shadow-lg backdrop-blur-sm">
          {children}
        </main>

        <p className="text-center text-xs text-slate-500">
          <Link href="/" className="transition-colors hover:text-campus-400">
            ← Return to UniVerse ICOS home
          </Link>
        </p>
      </div>
    </div>
  );
}
