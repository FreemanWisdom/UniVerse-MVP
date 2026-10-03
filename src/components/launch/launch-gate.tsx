import { findLaunchSchool, LAUNCH_SCHOOLS, WAITLIST_URL } from "@/lib/launch";
import { IconRocket } from "@/components/icons";
import { LogoutButton } from "@/components/auth/logout-button";

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
 * Full-screen access gate for students outside the five launch campuses.
 *
 * The MVP is restricted to LAUNCH_SCHOOLS — everyone else is signed in but
 * sees this waitlist message instead of the app shell (no nav, no feed
 * access). Rendered by the (student) layout in place of children; the
 * /admin route group is separate and unaffected.
 */
export function LaunchGate({ university }: { university?: string | null }) {
  const { title, body } = launchCopy(university);
  const launch = findLaunchSchool(university);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-campus-500/25 bg-surface-100/70 p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-campus-500/15">
          <IconRocket size={26} className="text-campus-400" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>

        <a
          href={WAITLIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-campus-500 px-4 text-sm font-bold text-black transition-colors hover:bg-campus-400"
        >
          Join the waitlist
        </a>

        {!launch && (
          <p className="mt-4 text-xs text-slate-500">
            Current launch campuses:{" "}
            {LAUNCH_SCHOOLS.map((s) => s.label.replace(/\s*\([^)]*\)$/, "")).join(", ")}.
          </p>
        )}

        <div className="mt-5">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
