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
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Join your campus
        </p>
        <CardTitle className="font-display text-xl">Create account</CardTitle>
        <CardDescription>
          Your school sets your campus — chat, study, and tribes are matched
          to it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignUpForm />

        <p className="border-t border-surface-200 pt-3 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-campus-400 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </>
  );
}
