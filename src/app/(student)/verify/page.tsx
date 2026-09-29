import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile";
import { VerifyStatusClient } from "@/features/verify/components/verify-status-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-400">
        <p>Authentication required.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const profile = await getProfile(supabase, user.id);

  if (!profile) {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center text-slate-400 space-y-2">
        <p className="text-red-400 font-medium">Profile could not be loaded.</p>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pb-2 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Verification</h1>
          <p className="text-sm text-slate-400">Your badge status, honestly.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verification status</CardTitle>
          <CardDescription>
            Verification is optional — every campus feature works without it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyStatusClient
            fullName={profile.full_name || ""}
            university={profile.university}
            studentVerified={profile.student_verified ?? false}
            emailConfirmed={profile.is_verified ?? false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
