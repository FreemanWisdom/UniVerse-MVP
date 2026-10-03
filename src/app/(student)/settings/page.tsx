import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationSettings } from "@/features/settings/components/notification-settings";
import { ThemeSettings } from "@/features/settings/components/theme-settings";
import { PasswordSettings } from "@/features/settings/components/password-settings";
import { LogoutButton } from "@/components/auth/logout-button";
import { ReplayIntroButton } from "@/components/onboarding/replay-intro-button";
import { InstallPrompt } from "@/components/pwa/install-prompt";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
      {children}
    </h2>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 rounded-lg border border-surface-200 bg-surface-100/70 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-400">
        <p>Authentication required.</p>
      </div>
    );
  }

  const emailConfirmed = Boolean(user.email_confirmed_at);

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8">
      <div>
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Settings
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
          Account &amp; preferences
        </h1>
      </div>

      {/* Account */}
      <section className="space-y-3" aria-label="Account">
        <SectionHeading>Account</SectionHeading>
        <div className="space-y-2">
          <SettingRow
            title="Edit profile"
            description="Name, bio, department, and photo"
          >
            <Link href="/profile">
              <Button variant="outline" size="sm" className="min-h-[36px]">Open</Button>
            </Link>
          </SettingRow>

          <SettingRow
            title="Email"
            description={user.email ?? "No email on file"}
          >
            <Badge variant={emailConfirmed ? "campus" : "outline"}>
              {emailConfirmed ? "Confirmed" : "Unconfirmed"}
            </Badge>
          </SettingRow>

          <PasswordSettings />
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-3" aria-label="Appearance">
        <SectionHeading>Appearance</SectionHeading>
        <ThemeSettings />
      </section>

      {/* Notifications */}
      <section className="space-y-3" aria-label="Notifications">
        <SectionHeading>Notifications</SectionHeading>
        <NotificationSettings />
      </section>

      {/* Privacy & Security */}
      <section className="space-y-3" aria-label="Privacy and security">
        <SectionHeading>Privacy &amp; Security</SectionHeading>
        <div className="space-y-2">
          <SettingRow title="Sign out" description="End your current session">
            <div className="flex min-h-[36px] items-center">
              <LogoutButton />
            </div>
          </SettingRow>
        </div>
      </section>

      {/* Application */}
      <section className="space-y-3" aria-label="Application">
        <SectionHeading>Application</SectionHeading>
        <div className="space-y-2">
          <InstallPrompt />

          <SettingRow
            title="Welcome tour"
            description="Replay the first-launch campus intro"
          >
            <ReplayIntroButton />
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
