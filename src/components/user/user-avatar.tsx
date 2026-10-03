"use client";

import Link from "next/link";
import { usePresence } from "./presence-provider";

/**
 * Shared avatar with optional presence indicator and profile navigation.
 *
 * One component for every place a fellow user is displayed: Orbit cards,
 * comments, Chat conversations/threads/discovery/requests, notifications.
 * Clicking it opens the user's profile at /u/[id].
 *
 * Presence dot: green = online on your campus, orange = offline.
 * Presence comes from the campus Realtime presence channel
 * (see presence-provider.tsx) — no database writes, no timers.
 *
 * - `profile.id` optional: when absent (or when `href` is empty) renders a
 *   plain, non-clickable avatar — used for the viewer's own header avatar.
 * - Pass `href` to override the destination (own profile links pass
 *   "self" when the id belongs to the viewer, which routes to /profile).
 */

export interface AvatarProfile {
  id?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

const SIZES = {
  sm: { box: "h-8 w-8", text: "text-xs", dot: "h-2.5 w-2.5" },
  md: { box: "h-9 w-9", text: "text-sm", dot: "h-3 w-3" },
  lg: { box: "h-12 w-12", text: "text-base", dot: "h-3.5 w-3.5" },
  xl: { box: "h-20 w-20", text: "text-2xl", dot: "h-5 w-5" },
} as const;

export type AvatarSize = keyof typeof SIZES;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface UserAvatarProps {
  profile: AvatarProfile;
  size?: AvatarSize;
  /** Show the presence dot (default true; off for own avatar / avatars without a profile id) */
  showPresence?: boolean;
  /** Destination override; omit for /u/{profile.id} */
  href?: string;
  /** Accessibility label; defaults to "View {name}'s profile" */
  label?: string;
  className?: string;
}

export function UserAvatar({
  profile,
  size = "sm",
  showPresence = true,
  href,
  label,
  className = "",
}: UserAvatarProps) {
  const { isOnline } = usePresence();
  const s = SIZES[size];

  const name = profile.full_name?.trim() || "Student";
  const canNavigate = Boolean(href ?? profile.id);
  const destination = href ?? (profile.id ? `/u/${profile.id}` : undefined);
  const withPresence = showPresence && Boolean(profile.id) && !href?.startsWith("/profile");

  const picture = (
    <span
      className={`relative flex ${s.box} shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-campus-500/20 font-semibold text-campus-300 ${className}`}
    >
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={s.text}>{initials(name) || name.charAt(0).toUpperCase()}</span>
      )}
      {withPresence && (
        <span
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full border-2 border-background ${
            isOnline(profile.id as string) ? "bg-emerald-500" : "bg-orange-500"
          }`}
          aria-hidden="true"
        />
      )}
    </span>
  );

  if (!canNavigate || !destination) return picture;

  return (
    <Link
      href={destination}
      aria-label={label ?? `View ${name}'s profile`}
      className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500"
      onClick={(e) => e.stopPropagation()}
    >
      {picture}
    </Link>
  );
}
