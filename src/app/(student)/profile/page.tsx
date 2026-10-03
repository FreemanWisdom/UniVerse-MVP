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

  // Own profile only: wallet is client-readable per the 5C column grants.
  let walletBalance: number | null = null;
  const { data: walletRow } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .maybeSingle();
  if (walletRow && typeof walletRow.wallet_balance === "number") {
    walletBalance = walletRow.wallet_balance;
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto w-full">
      <div>
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Profile
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
          Your campus identity
        </h1>
      </div>

      <ProfilePageClient
        initialProfile={profile}
        email={user.email ?? ""}
        walletBalance={walletBalance}
        memberSince={user.created_at ?? null}
      />
    </div>
  );
}
