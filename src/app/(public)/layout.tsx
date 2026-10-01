import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth/session";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isAuthenticated()) {
    redirect("/orbit");
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* Atmospheric layers — fixed, behind everything */}
      <div className="uv-bg-field" aria-hidden="true" />
      <div className="uv-grid-overlay" aria-hidden="true" />

      {/* Navigation */}
      <header className="uv-content sticky top-0 z-40 border-b border-white/[0.06] bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-md"
          >
            {/* Green glow dot — UniVerse brand mark */}
            <span
              className="h-2.5 w-2.5 rounded-full bg-campus-500 shadow-[0_0_10px_#22c55e]"
              aria-hidden="true"
            />
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              UniVerse
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="default" size="sm">
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="uv-content flex-1">{children}</main>

      {/* Footer */}
      <footer className="uv-content border-t border-white/[0.05] py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} UniVerse ICOS — Integrated Campus Operating System for Nigerian Students.
          </p>
        </div>
      </footer>
    </div>
  );
}
