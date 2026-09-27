import Link from "next/link";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";
import { isAuthenticated } from "@/lib/auth/session";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/orbit" className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-campus-500 shadow-[0_0_10px_#22c55e]" />
            <span className="text-base font-bold tracking-tight text-foreground">
              UniVerse <span className="text-campus-500 font-mono text-xs">ICOS</span> <span className="text-slate-400 font-mono text-xs">STUDENT</span>
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            <NotificationsBell />
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-300 bg-surface-200 text-xs font-semibold text-foreground hover:border-campus-500 transition-colors"
            >
              U
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto flex max-w-7xl flex-1 px-4 py-6">
        <aside className="hidden w-64 flex-col space-y-1 pr-8 md:flex">
          <div className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Campus Navigation
          </div>
          {siteConfig.navItems
            .filter((item) => item.href !== "/settings")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface-200 hover:text-foreground"
              >
                {item.title}
              </Link>
            ))}

          <div className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Study Modules
          </div>
          <Link
            href="/study/tribes"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-surface-200 hover:text-foreground"
          >
            Study Tribes
          </Link>
          <Link
            href="/study/tutor"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-surface-200 hover:text-foreground"
          >
            AI Tutor
          </Link>

          <Link
            href="/settings"
            className="mt-auto flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-surface-200 hover:text-foreground"
          >
            Settings
          </Link>
        </aside>

        <main className="flex-1 max-w-3xl">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-surface-200 bg-surface-50/95 backdrop-blur-lg md:hidden">
        <div className="flex w-full items-center justify-around px-2">
          <Link
            href="/orbit"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <span className="text-base">🪐</span>
            <span className="text-[10px]">Orbit</span>
          </Link>
          <Link
            href="/study"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <span className="text-base">📚</span>
            <span className="text-[10px]">Study</span>
          </Link>
          <Link
            href="/whisper"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <span className="text-base">🤫</span>
            <span className="text-[10px]">Whisper</span>
          </Link>
          <Link
            href="/chat"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <span className="text-base">💬</span>
            <span className="text-[10px]">Chat</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <span className="text-base">⚙️</span>
            <span className="text-[10px]">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
