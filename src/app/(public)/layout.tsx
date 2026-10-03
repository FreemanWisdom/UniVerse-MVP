import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth/session";
import { RecoveryLinkWatcher } from "@/components/auth/recovery-link-watcher";

/*
 * Universe ICOS public layout.
 *
 * Nav and footer copy are ported from the legacy HTML landing page,
 * with the product name corrected to "Universe ICOS".
 */

const NAV_SECTIONS = [
  { title: "Overview", href: "/#overview" },
  { title: "Ecosystem", href: "/#ecosystem" },
  { title: "How It Works", href: "/#how-it-works" },
  { title: "V1.0 MVP", href: "/#v1" },
  { title: "Community", href: "/#community" },
  { title: "Company", href: "/#about" },
];

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { title: "Orbit", href: "/#ecosystem" },
      { title: "Campus Chat", href: "/#ecosystem" },
      { title: "Study Tribes", href: "/#ecosystem" },
      { title: "AI Tutor", href: "/#ecosystem" },
      { title: "Campus Whisper", href: "/#ecosystem" },
      { title: "Study Hub", href: "/#ecosystem" },
    ],
  },
  {
    heading: "Company",
    links: [
      { title: "About Universe ICOS", href: "/#about" },
      { title: "Vision", href: "/#about" },
      { title: "Team", href: "/#team" },
      { title: "Timeline", href: "/#timeline" },
    ],
  },
];

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

      {/* Forward Supabase recovery hashes to /reset-password */}
      <RecoveryLinkWatcher />

      {/* Navigation */}
      <header className="uv-content sticky top-0 z-40 border-b border-white/[0.06] bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-md"
          >
            {/* Green glow dot — Universe ICOS brand mark */}
            <span
              className="h-2.5 w-2.5 rounded-full bg-campus-500 shadow-[0_0_10px_#22c55e]"
              aria-hidden="true"
            />
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              Universe ICOS
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="mr-2 hidden items-center gap-1 lg:flex" aria-label="Sections">
              {NAV_SECTIONS.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="default" size="sm">
                Join Universe ICOS
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="uv-content flex-1">{children}</main>

      {/* Footer — legacy landing-page footer content */}
      <footer className="uv-content border-t border-white/[0.05] py-14" aria-label="Universe ICOS footer">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="font-display text-lg font-bold text-foreground">
                Universe ICOS
              </div>
              <div className="mt-1 font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                The Integrated Campus Operating System
              </div>
              <p className="mt-3 max-w-xs text-sm text-slate-500">
                A student-focused digital infrastructure for campus life.
              </p>
            </div>

            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="mb-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                  {col.heading}
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  {col.links.map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="w-fit text-slate-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-sm"
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <div className="mb-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                Community &amp; Legal
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <Link
                  href="/#faq"
                  className="w-fit text-slate-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-sm"
                >
                  FAQ
                </Link>
                <Link
                  href="/privacy"
                  className="w-fit text-slate-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-sm"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/community-standards"
                  className="w-fit text-slate-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-sm"
                >
                  Community Standards
                </Link>
                <Link
                  href="/signup"
                  className="w-fit text-slate-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-sm"
                >
                  Join Universe ICOS
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-8 text-center sm:flex-row sm:text-left">
            <div className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-slate-500">
              Universe ICOS v1.0 · MVP · Nigerian Universities
            </div>
            <div className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-slate-500">
              © 2026 Universe ICOS
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
