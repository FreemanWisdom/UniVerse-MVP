"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  IconContent,
  IconDashboard,
  IconExit,
  IconFlag,
  IconSchool,
  IconSettings,
  IconShieldCheck,
  IconUsers,
} from "@/components/admin/icons";

type NavItem = { title: string; href: string; icon: React.ReactNode };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Console",
    items: [
      { title: "Overview", href: "/admin/overview", icon: <IconDashboard size={16} /> },
      { title: "Users", href: "/admin/users", icon: <IconUsers size={16} /> },
      { title: "Content", href: "/admin/content", icon: <IconContent size={16} /> },
      { title: "Reports", href: "/admin/reports", icon: <IconFlag size={16} /> },
    ],
  },
  {
    label: "Campus",
    items: [
      { title: "Schools", href: "/admin/schools", icon: <IconSchool size={16} /> },
      { title: "Verification", href: "/admin/verification", icon: <IconShieldCheck size={16} /> },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", href: "/admin/settings", icon: <IconSettings size={16} /> },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/overview") {
    return pathname === "/admin" || pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ pathname, role, onNavigate }: { pathname: string; role?: string | null; onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <span className={cn(active ? "text-blue-600" : "text-slate-400")}>{item.icon}</span>
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        {role ? (
          <span className="mb-1.5 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {role.replace(/_/g, " ")}
          </span>
        ) : null}
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <IconExit size={15} />
          Back to Campus
        </Link>
      </div>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-b border-slate-100", compact ? "h-14 px-4" : "h-16 px-5")}>
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white",
          compact ? "h-7 w-7 text-[10px]" : "h-8 w-8"
        )}
      >
        U
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-slate-900">UniVerse ICOS</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Admin Console</p>
      </div>
    </div>
  );
}

export function AdminSidebar({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <Brand />
        <SidebarNav pathname={pathname} role={role} />
      </aside>

      {/* Mobile: sticky top bar with hamburger + slide-in drawer */}
      <div className="md:hidden">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-nav"
              aria-label="Open admin navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <p className="text-sm font-semibold tracking-tight text-slate-900">
              UniVerse ICOS <span className="text-xs font-medium text-slate-400">Admin</span>
            </p>
          </div>
          <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-900">
            Exit
          </Link>
        </div>

        {/* Drawer overlay */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-slate-900/40 transition-opacity md:hidden",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <aside
          id="admin-mobile-nav"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-hidden={!mobileOpen}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pr-2 [&>div]:flex-1">
            <Brand compact />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close admin navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SidebarNav pathname={pathname} role={role} onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
