import Link from "next/link";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-campus-500 shadow-[0_0_12px_#22c55e]" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              UniVerse <span className="text-campus-500 font-mono text-sm">ICOS</span>
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="default" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-surface-200 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {siteConfig.name}. Integrated Campus Operating System for Nigerian Students.</p>
      </footer>
    </div>
  );
}
