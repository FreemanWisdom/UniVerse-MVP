"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function AdminSidebar({ role }: { role?: string | null }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
            U
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-slate-900">UniVerse</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Admin Console</p>
          </div>
        </div>

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
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <IconExit size={15} />
            Back to Campus
          </Link>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">
              U
            </span>
            <p className="text-sm font-semibold tracking-tight text-slate-900">
              UniVerse <span className="text-xs font-medium text-slate-400">Admin</span>
            </p>
          </div>
          <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-900">
            Exit
          </Link>
        </div>
        <nav className="overflow-x-auto border-b border-slate-200 bg-white px-3 py-2" aria-label="Admin sections">
          <div className="flex w-max items-center gap-1">
            {NAV_GROUPS.flatMap((group) => group.items).map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
