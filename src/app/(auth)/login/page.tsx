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
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Welcome back
        </p>
        <CardTitle className="font-display text-xl">Sign in</CardTitle>
        <CardDescription>Access your campus workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />

        <p className="border-t border-surface-200 pt-3 text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-campus-400 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </>
  );
}
