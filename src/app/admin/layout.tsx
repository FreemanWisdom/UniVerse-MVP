import Link from "next/link";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  // Admin gate (server-side): admin_bootstrap() returns the caller's admin
  // membership or authorized=false. All admin RPCs re-check their own gates.
  const supabase = await createClient();
  const { data: bootstrap } = await supabase.rpc("admin_bootstrap");
  if (!bootstrap?.authorized) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-xl font-bold text-foreground">Admin access required</h1>
              <p className="mt-2 text-sm text-slate-400">
                This account doesn&#39;t have an administrator role assigned to it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-surface-50/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
              <span className="text-base font-bold tracking-tight text-foreground">
                UniVerse <span className="text-amber-500 font-mono text-xs">ADMIN</span>
              </span>
            </Link>
            <Badge variant="outline">Structural Shell Only</Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-foreground transition-colors"
            >
              Exit to Portal
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex max-w-7xl flex-1 px-4 py-6">
        {/* Admin Navigation Sidebar */}
        <aside className="w-56 shrink-0 flex-col space-y-1 pr-6 hidden md:flex">
          <div className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Administration
          </div>
          {siteConfig.adminNavItems
            .filter((item) => item.href !== "/admin/settings")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface-200 hover:text-foreground"
              >
                {item.title}
              </Link>
            ))}
          <Link
            href="/admin/settings"
            className="mt-auto flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-surface-200 hover:text-foreground"
          >
            Settings
          </Link>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
