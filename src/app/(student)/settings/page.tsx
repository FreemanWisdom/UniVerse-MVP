import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "@/features/settings/components/notification-settings";
import { ThemeSettings } from "@/features/settings/components/theme-settings";
import { LogoutButton } from "@/components/auth/logout-button";
import { ReplayIntroButton } from "@/components/onboarding/replay-intro-button";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-400">
        <p>Authentication required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pb-2 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-slate-400">Manage your account and preferences.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>Update your campus identity, or replay the welcome tour</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Profile Information</p>
                <p className="text-xs text-slate-400">Edit your name, bio, and academic details</p>
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm">Edit Profile</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <ThemeSettings />

        {/* Notifications Section */}
        <NotificationSettings />

        {/* Privacy Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Privacy & Security</CardTitle>
            <CardDescription>Manage your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Security Defaults</p>
                <p className="text-xs text-slate-400">Your data is protected by Supabase RLS</p>
              </div>
              <Badge variant="campus">Active</Badge>
            </div>
            
            <div className="pt-4 mt-4 border-t border-surface-200 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-foreground">Sign Out</p>
                <p className="text-xs text-slate-400">End your current session</p>
              </div>
              {/* Ensure LogoutButton uses a solid appearance if preferred, but ghost is fine */}
              <div className="bg-surface-200 rounded-md">
                 <LogoutButton />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-surface-200 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-foreground">Welcome Tour</p>
                <p className="text-xs text-slate-400">Replay the first-launch campus intro</p>
              </div>
              <ReplayIntroButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
