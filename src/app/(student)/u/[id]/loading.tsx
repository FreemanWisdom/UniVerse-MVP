/**
 * Instant skeleton for the user-profile route. With this boundary in place,
 * a click on a student's name swaps in the skeleton immediately while the
 * server fetches the profile, instead of freezing on the previous page —
 * and Next can prefetch the skeleton as soon as the link enters the
 * viewport.
 */
export default function UserProfileLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-20 animate-pulse rounded-lg bg-surface-200" />

      {/* Identity header */}
      <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-surface-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-surface-200" />
            <div className="h-3 w-56 animate-pulse rounded bg-surface-200" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-surface-200" />
          </div>
        </div>
      </div>

      {/* Connect actions */}
      <div className="h-10 w-full animate-pulse rounded-lg bg-surface-200" />

      {/* Details */}
      <div className="divide-y divide-white/5 rounded-lg border border-surface-200 bg-surface-100/50 px-4">
        <div className="flex items-baseline justify-between py-2">
          <div className="h-3 w-12 animate-pulse rounded bg-surface-200" />
          <div className="h-4 w-28 animate-pulse rounded bg-surface-200" />
        </div>
        <div className="flex items-baseline justify-between py-2">
          <div className="h-3 w-20 animate-pulse rounded bg-surface-200" />
          <div className="h-4 w-36 animate-pulse rounded bg-surface-200" />
        </div>
      </div>
    </div>
  );
}
