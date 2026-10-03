import { redirect } from "next/navigation";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isAuthenticated } from "@/lib/auth/session";

export const metadata = {
  title: "Reset your password",
};

export default async function ForgotPasswordPage() {
  // Authenticated users never need a reset request; keep them in the app.
  if (await isAuthenticated()) {
    redirect("/orbit");
  }

  return (
    <>
      <CardHeader>
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Account recovery
        </p>
        <CardTitle className="font-display text-xl">Forgotten password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </>
  );
}
