import { findLaunchSchool, WAITLIST_URL } from "@/lib/launch";

function launchCopy(university: string | null | undefined) {
  const launch = findLaunchSchool(university);
  if (launch) {
    return {
      title: `UniVerse is launching at ${launch.label} soon!`,
      body: "You're in early — the full launch on your campus is right around the corner. Join the waitlist for early access and to be first to know when we go live.",
    };
  }
  return {
    title: "UniVerse is launching soon",
    body: "We're kicking off at our first campuses and growing from there. Join the waitlist and we'll let you know the moment we go live at yours.",
  };
}

/**
 * "Launching soon + join the waitlist" notice shown right after signup
 * (on the check-your-mail screen), personalized when the student picked a
 * launch campus.
 */
export function LaunchNotice({ university }: { university?: string | null }) {
  const { title, body } = launchCopy(university);

  return (
    <div
      className="rounded-xl border border-campus-500/25 bg-campus-500/5 p-4 text-left"
      data-testid="launch-notice"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{body}</p>
      <a
        href={WAITLIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-[36px] items-center rounded-lg bg-campus-500 px-3.5 py-2 text-xs font-bold text-black transition-colors hover:bg-campus-400"
      >
        Join the waitlist
      </a>
    </div>
  );
}
