"use client";

import { StudentProfile } from "@/features/profile/profile.types";
import { Badge } from "@/components/ui/badge";
import { ProfilePhotoUpload } from "./profile-photo-upload";
import { Button } from "@/components/ui/button";

interface ProfileViewProps {
  profile: StudentProfile;
  onEdit: () => void;
  onAvatarUpdated?: (url: string) => void;
}

export function ProfileView({ profile, onEdit, onAvatarUpdated }: ProfileViewProps) {
  const displayUsername =
    profile.username ||
    String(profile.full_name || "student")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) ||
    "student";

  return (
    <div className="space-y-4">
      {/* Compact identity header */}
      <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
        <div className="flex items-center gap-4">
          <ProfilePhotoUpload
            userId={profile.id}
            initialUrl={profile.avatar_url || null}
            initialName={profile.full_name || undefined}
            onUploadSuccess={onAvatarUpdated}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground truncate">
                  {profile.full_name || "Student"}
                </h2>
                <p className="text-xs text-slate-400">@{displayUsername}</p>
              </div>
              <Button onClick={onEdit} variant="outline" size="sm" className="shrink-0">
                Edit
              </Button>
            </div>

            {(profile.university || profile.department) && (
              <p className="mt-1 truncate text-xs text-slate-400">
                {[profile.university, profile.department].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.student_verified && (
                <Badge variant="campus">Verified Student</Badge>
              )}
              {profile.level && (
                <Badge variant="secondary">{profile.level} Level</Badge>
              )}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 whitespace-pre-wrap border-t border-surface-200 pt-3 text-sm leading-relaxed text-foreground">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Academic details */}
      <section className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
        <h3 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Academic Info
        </h3>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-xs text-slate-400">Institution</dt>
            <dd className="min-w-0 text-right text-foreground">
              {profile.university || <span className="text-slate-500">Not provided</span>}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-xs text-slate-400">Department</dt>
            <dd className="min-w-0 text-right text-foreground">
              {profile.department || <span className="text-slate-500">Not provided</span>}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-xs text-slate-400">Level</dt>
            <dd className="min-w-0 text-right text-foreground">
              {profile.level || <span className="text-slate-500">Not provided</span>}
            </dd>
          </div>
        </dl>
        {!profile.university && (
          <p className="mt-3 border-t border-surface-200 pt-3 text-xs text-slate-400">
            No campus set — chat discovery, study resources, and tribes are
            matched to your school. Contact your campus admin to set yours.
          </p>
        )}
      </section>
    </div>
  );
}
