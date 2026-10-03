"use client";

import { useState } from "react";
import Link from "next/link";
import { StudentProfile } from "@/features/profile/profile.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfilePhotoUpload } from "./profile-photo-upload";
import { JourneyModal } from "./journey-modal";
import { FutureIcosModal } from "./future-icos-modal";
import {
  IconStar,
  IconPencil,
  IconIdCard,
  IconChevronRight,
  IconClipboardList,
} from "@/components/icons";

interface ProfileViewProps {
  profile: StudentProfile;
  email: string;
  walletBalance: number | null;
  memberSince: string | null;
  onEdit: () => void;
  onAvatarUpdated?: (url: string) => void;
}

function memberSinceLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Reputation ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar
          key={n}
          className={
            n <= rating ? "h-4 w-4 fill-campus-500 text-campus-500" : "h-4 w-4 text-surface-300"
          }
        />
      ))}
    </span>
  );
}

export function ProfileView({
  profile,
  email,
  walletBalance,
  memberSince,
  onEdit,
  onAvatarUpdated,
}: ProfileViewProps) {
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);

  // Profile strength: share of key details the student has filled in.
  // University is guaranteed at signup, so it anchors the set.
  const details = [
    { label: "profile photo", filled: Boolean(profile.avatar_url) },
    { label: "full name", filled: Boolean(profile.full_name?.trim()) },
    { label: "campus email", filled: Boolean(email) },
    { label: "bio", filled: Boolean(profile.bio?.trim()) },
    { label: "department", filled: Boolean(profile.department?.trim()) },
    { label: "level", filled: Boolean(profile.level?.trim()) },
    { label: "interests", filled: (profile.interests?.length ?? 0) > 0 },
  ];
  const filledCount = details.filter((d) => d.filled).length;
  const missing = details.filter((d) => !d.filled).length;
  const strengthPct = Math.round((filledCount / details.length) * 100);

  const interests = profile.interests?.filter(Boolean) ?? [];

  return (
    <div className="space-y-4">
      {/* Identity banner */}
      <section className="overflow-hidden rounded-xl border border-surface-200 bg-surface-100/70">
        <div className="h-16 bg-surface-200/60" aria-hidden="true" />
        <div className="flex flex-col items-center px-4 pb-5 text-center">
          <div className="-mt-12">
            <ProfilePhotoUpload
              userId={profile.id}
              initialUrl={profile.avatar_url || null}
              initialName={profile.full_name || undefined}
              onUploadSuccess={onAvatarUpdated}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
              {profile.full_name || "Student"}
            </h2>
            {profile.student_verified && (
              <span className="rounded-md bg-campus-500 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-black">
                Verified
              </span>
            )}
          </div>

          <p className="mt-1 text-xs leading-snug text-slate-400">{profile.university}</p>

          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
            <Badge variant="secondary">
              {profile.department?.trim() || "Department not added"}
            </Badge>
            <Badge variant="secondary">{profile.level?.trim() || "Level not added"}</Badge>
          </div>

          <Button
            onClick={onEdit}
            className="mt-4 min-h-[44px] w-full max-w-xs gap-2"
          >
            <IconPencil className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <h3 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          About
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {profile.bio?.trim() || (
            <span className="text-slate-500">Add a short bio so people know you.</span>
          )}
        </p>
        <div className="mt-3 flex items-center gap-2 border-t border-surface-200 pt-3">
          <Stars rating={0} />
          <span className="text-xs text-slate-400">0/5</span>
        </div>
      </section>

      {/* Profile strength */}
      <section className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
            Profile Strength
          </h3>
          <span className="font-display text-sm font-bold text-campus-400">
            {strengthPct}%
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">
          Complete your student profile
        </p>
        <div
          className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-200"
          role="progressbar"
          aria-valuenow={strengthPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile strength"
        >
          <div
            className="h-full rounded-full bg-campus-500 transition-all"
            style={{ width: `${strengthPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {missing === 0
            ? "Every detail is in place. You're all set."
            : `${missing} profile detail${missing === 1 ? "" : "s"} still missing.`}
        </p>
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-3 divide-x divide-surface-200 rounded-xl border border-surface-200 bg-surface-100/70 py-3 text-center">
        <div className="px-2">
          <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-400">
            Wallet
          </p>
          <p className="mt-1 text-sm font-bold text-campus-400">
            ₦{walletBalance != null ? walletBalance.toFixed(2) : "0.00"}
          </p>
        </div>
        <div className="px-2">
          <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-400">
            Reputation
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">0/5</p>
        </div>
        <div className="px-2">
          <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-400">
            Member Since
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {memberSinceLabel(memberSince)}
          </p>
        </div>
      </section>

      {/* Identity details */}
      <section className="rounded-xl border border-surface-200 bg-surface-100/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
              Identity
            </h3>
            <p className="mt-0.5 text-sm font-semibold text-foreground">About you</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-300 bg-surface-200 text-campus-400">
            <IconIdCard className="h-4 w-4" />
          </span>
        </div>

        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              University Email
            </dt>
            <dd className="mt-0.5 break-all text-foreground">{email || "—"}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              Institution
            </dt>
            <dd className="mt-0.5 text-foreground">
              {profile.university || <span className="text-slate-500">Not provided</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              Department
            </dt>
            <dd className="mt-0.5 text-foreground">
              {profile.department?.trim() || (
                <span className="text-slate-500">Department not added</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              Level
            </dt>
            <dd className="mt-0.5 text-foreground">
              {profile.level?.trim() || <span className="text-slate-500">Level not added</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              Bio
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-foreground">
              {profile.bio?.trim() || (
                <span className="text-slate-500">Add a short bio so people know you.</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-surface-200 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              Interests
            </p>
            {interests.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {interests.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-slate-500">No interests added yet</p>
            )}
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              Campus Identity
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              Builds with your reputation, coming in a later version.
            </p>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="rounded-xl border border-surface-200 bg-surface-100/70 p-2">
        <div className="px-2 pt-2">
          <h3 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
            Account
          </h3>
        </div>
        <nav className="mt-1" aria-label="Account">
          <Link
            href="/settings"
            className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg px-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-200/70"
          >
            <span>Settings</span>
            <IconChevronRight className="h-4 w-4 text-slate-500" />
          </Link>
          <Link
            href="/settings/survey"
            className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg px-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-200/70"
          >
            <span className="flex items-center gap-2">
              <IconClipboardList className="h-4 w-4 text-campus-400" />
              UniVerse Survey
            </span>
            <IconChevronRight className="h-4 w-4 text-slate-500" />
          </Link>
          <button
            type="button"
            onClick={() => setJourneyOpen(true)}
            className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-200/70"
          >
            <span>The UniVerse Journey</span>
            <IconChevronRight className="h-4 w-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => setFutureOpen(true)}
            className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-200/70"
          >
            <span>Future ICOS Experiences</span>
            <span className="flex items-center gap-1">
              <span className="rounded-full bg-campus-950 px-1.5 py-0.5 text-[0.55rem] font-bold tracking-wide text-campus-400 border border-campus-800">
                BETA
              </span>
              <IconChevronRight className="h-4 w-4 text-slate-500" />
            </span>
          </button>
        </nav>
      </section>

      <JourneyModal open={journeyOpen} onClose={() => setJourneyOpen(false)} />
      <FutureIcosModal open={futureOpen} onClose={() => setFutureOpen(false)} />
    </div>
  );
}
