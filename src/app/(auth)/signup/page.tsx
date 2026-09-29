import Link from "next/link";
import { redirect } from "next/navigation";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SignUpForm } from "@/components/auth/signup-form";
import { isAuthenticated } from "@/lib/auth/session";

export default async function SignUpPage() {
  if (await isAuthenticated()) {
    redirect("/orbit");
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Create Account</CardTitle>
        <CardDescription>
          Start your student account and continue to verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-slate-300">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-campus-400">Route: /signup</p>
          <p className="mt-2 text-slate-400">
            Your school choice sets your campus — chat, study, and tribes are matched to it.
            Verification is optional and never blocks any feature.
          </p>
        </div>

        <SignUpForm />

        <div className="text-center text-xs text-slate-400 pt-2">
          Already registered?{" "}
          <Link href="/login" className="text-campus-400 hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </>
  );
}
