import Link from "next/link";
import { redirect } from "next/navigation";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { isAuthenticated } from "@/lib/auth/session";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/orbit");
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Sign In</CardTitle>
        <CardDescription>
          Access your UniVerse ICOS student workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-slate-300">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-campus-400">Route: /login</p>
          <p className="mt-2 text-slate-400">
            Secure login uses the existing Supabase Auth session and project configuration.
          </p>
        </div>

        <LoginForm />

        <div className="text-center text-xs text-slate-400 pt-2">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-campus-400 hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </>
  );
}
