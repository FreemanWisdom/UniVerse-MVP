import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile";
import { StudentProfile } from "@/features/profile/profile.types";

/**
 * Read-only profile view for a fellow student.
 *
 * Security model: the profiles SELECT policy allows any authenticated user to
 * read any row, but the 5C column grants expose only the safe public columns —
 * getProfile selects exactly that granted set (id, full_name, avatar_url,
 * university, department, level, bio, interests, is_verified,
 * student_verified). Nothing private (admin notes, account status, wallet,
 * email, auth metadata) is reachable from this page.
 */

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  // A user viewing their own id goes to the editable profile instead.
  if (user && user.id === id) redirect("/profile");

  const supabase = await createClient();
  const profile: StudentProfile | null = await getProfile(supabase, id);

  const name = profile?.full_name?.trim() || "Student";

  return (
    <div className="space-y-4">
      <BackButton href="/orbit" label="Back to Orbit" />
      {!profile ? (
        <div className="rounded-lg border border-surface-200 bg-surface-100/50 p-8 text-center">
          <p className="text-sm font-semibold text-foreground">Profile not found</p>
          <p className="mt-1 text-xs text-slate-500">
            This student isn&apos;t on Campus or the profile is unavailable.
          </p>
          <Link
            href="/orbit"
            className="mt-4 inline-block rounded-lg border border-surface-300 bg-surface-200 px-4 py-2 text-xs font-medium text-foreground"
          >
            Back to Orbit
          </Link>
        </div>
      ) : (
        <>
          {/* Identity header */}
          <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-campus-500/20 font-semibold text-campus-300">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`${name} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl">{initials(name) || "?"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold text-foreground">{name}</h1>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {profile.university ?? "Campus"}
                  {profile.department ? ` · ${profile.department}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.student_verified && <Badge>Verified student</Badge>}
                  {profile.is_verified && <Badge>Email verified</Badge>}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="divide-y divide-white/5 rounded-lg border border-surface-200 bg-surface-100/50 px-4">
            {profile.level && <InfoRow label="Level" value={profile.level} />}
            {profile.department && <InfoRow label="Department" value={profile.department} />}
            {profile.university && <InfoRow label="Campus" value={profile.university} />}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="rounded-lg border border-surface-200 bg-surface-100/50 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                About
              </h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="rounded-lg border border-surface-200 bg-surface-100/50 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Interests
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <Badge key={interest} className="bg-campus-500/15 text-campus-300">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
