import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/sidebar";

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
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4">
          <div className="w-full rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-10 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
              Administrator access required
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              This account doesn&apos;t have an administrator role assigned to it. If you believe
              this is a mistake, contact the platform team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 md:flex">
      <AdminSidebar role={bootstrap?.admin?.role ?? null} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
