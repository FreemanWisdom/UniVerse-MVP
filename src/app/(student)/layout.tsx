import Link from "next/link";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";
import { WelcomeCarousel } from "@/components/onboarding/welcome-carousel";
import { PostTourInstallPrompt } from "@/components/pwa/post-tour-install-prompt";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile";
import { PresenceProvider } from "@/components/user/presence-provider";
import { UserAvatar } from "@/components/user/user-avatar";
import {
  IconPlanet,
  IconBooks,
  IconChat,
  IconWhisper,
  IconBot,
  IconUsers,
  IconSettings,
  IconBell,
} from "@/components/icons";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const profile = await getProfile(supabase, user.id);

  return (
    <PresenceProvider userId={profile?.id ?? user.id} university={profile?.university ?? ""}>
    <div className="flex min-h-screen flex-col bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <WelcomeCarousel />
      <PostTourInstallPrompt />
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/orbit" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-campus-500 shadow-[0_0_10px_#22c55e]" aria-hidden="true" />
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              Universe ICOS
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            <NotificationsBell />
            <UserAvatar
              profile={{ id: profile?.id ?? user.id, full_name: profile?.full_name, avatar_url: profile?.avatar_url }}
              href="/profile"
              size="sm"
              className="border border-surface-300 bg-surface-200 text-foreground"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto flex max-w-7xl flex-1 px-2 py-3 sm:px-4 md:py-6">
        <aside className="hidden w-64 flex-col space-y-1 pr-8 md:flex">
          <div className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Campus Navigation
          </div>
          {siteConfig.navItems
            .filter((item) => item.href !== "/settings")
            .map((item) => {
              const NavIcon = NAV_ICONS[item.href] ?? IconPlanet;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-surface-200 hover:text-foreground"
                >
                  <NavIcon size={16} className="shrink-0 text-slate-500" />
                  {item.title}
                </Link>
              );
            })}

          <div className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Study Modules
          </div>
          <Link
            href="/study/tribes"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-surface-200 hover:text-foreground"
          >
            <IconUsers size={16} className="shrink-0 text-slate-500" />
            Study Tribes
          </Link>
          <Link
            href="/study/tutor"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-surface-200 hover:text-foreground"
          >
            <IconBot size={16} className="shrink-0 text-slate-500" />
            AI Tutor
          </Link>

          <Link
            href="/settings"
            className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-surface-200 hover:text-foreground"
          >
            <IconSettings size={16} className="shrink-0 text-slate-500" />
            Settings
          </Link>
        </aside>

        <main className="min-w-0 w-full flex-1 max-w-2xl">
          {children}
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex-col border-t border-surface-200 bg-surface-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
      >
        <div className="flex h-14 w-full items-center justify-around px-2">
          <Link
            href="/orbit"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <IconPlanet size={20} />
            <span className="text-[10px]">Orbit</span>
          </Link>
          <Link
            href="/study"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <IconBooks size={20} />
            <span className="text-[10px]">Study</span>
          </Link>
          <Link
            href="/whisper"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <IconWhisper size={20} />
            <span className="text-[10px]">Whisper</span>
          </Link>
          <Link
            href="/chat"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <IconChat size={20} />
            <span className="text-[10px]">Chat</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center py-1 text-xs text-slate-400 hover:text-campus-400"
          >
            <IconSettings size={20} />
            <span className="text-[10px]">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
    </PresenceProvider>
  );
}

/** Icon per student nav route — one visual language across the app. */
const NAV_ICONS: Record<string, (p: React.SVGProps<SVGSVGElement> & { size?: number }) => React.JSX.Element> = {
  "/orbit": IconPlanet,
  "/study": IconBooks,
  "/whisper": IconWhisper,
  "/chat": IconChat,
  "/notifications": IconBell,
  "/profile": IconUsers,
};
