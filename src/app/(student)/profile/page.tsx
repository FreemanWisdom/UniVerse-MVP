import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile";
import { ProfilePageClient } from "@/features/profile/components/profile-page-client";

export default async function ProfilePage() {
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Profile</h1>
          <p className="text-sm text-slate-400">Manage your campus identity.</p>
        </div>
      </div>

      <ProfilePageClient initialProfile={profile} />
    </div>
  );
}
