import Link from "next/link";
import { Button } from "@/components/ui/button";

/*
 * UniVerse public home page.
 *
 * Design goals:
 * - Deep-space campus atmosphere (handled by layout's uv-bg-field / uv-grid-overlay)
 * - Strong hero with a clear orbit visual
 * - Concise, honest copy — no fake metrics, no invented claims
 * - Primary CTA → /signup   Secondary → /login
 * - No Admin Portal link anywhere on this page
 * - Excellent mobile layout
 * - Respects reduced-motion (orbit spin is CSS-only, paused by prefers-reduced-motion)
 */

const ECOSYSTEM = [
  {
    icon: "🪐",
    label: "Social Layer",
    name: "Orbit",
    description:
      "Your campus social feed. Share what's happening, react to posts, and stay connected to the conversations around you.",
  },
  {
    icon: "📚",
    label: "Academic Layer",
    name: "Study Hub",
    description:
      "Course materials, study bookmarks, and AI tutor assistance — all organised around your school and level.",
  },
  {
    icon: "🤫",
    label: "Expression Layer",
    name: "Whisper",
    description:
      "Anonymous campus discourse. Share thoughts, vent, and confess without your identity ever being exposed.",
  },
  {
    icon: "💬",
    label: "Communication Layer",
    name: "Campus Chat",
    description:
      "Direct student messaging with privacy controls. Connect with anyone on campus on your own terms.",
  },
  {
    icon: "👥",
    label: "Community Layer",
    name: "Study Tribes",
    description:
      "Join and build focused study groups around courses, interests, or departments at your school.",
  },
  {
    icon: "🤖",
    label: "Intelligence Layer",
    name: "AI Tutor",
    description:
      "Ask questions, get explanations, and work through problems at 2am when no one else is awake.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ================================================================
          HERO
          ================================================================ */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Left column — copy & CTAs */}
            <div>
              {/* Eyebrow badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-campus-500/25 px-3.5 py-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-campus-500"
                  style={{ animation: "uv-blink 2.4s ease-in-out infinite" }}
                  aria-hidden="true"
                />
                <span className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-campus-400">
                  V1.0 · Live on Nigerian campuses
                </span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Your campus,{" "}
                <span className="bg-gradient-to-br from-campus-400 to-campus-600 bg-clip-text text-transparent">
                  all in one place.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
                UniVerse connects Nigerian university students through a single
                secure platform — campus feed, direct chat, anonymous whispers,
                study groups, and AI tutoring built around your school.
              </p>

              <div className="mt-4 border-l-2 border-campus-500/40 pl-4">
                <p className="text-sm leading-relaxed text-slate-500">
                  Every feed, conversation, and study group is{" "}
                  <strong className="font-medium text-slate-300">
                    scoped to your university
                  </strong>
                  . Only your fellow students see what happens here.
                </p>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup">
                  <Button size="lg" variant="default" className="font-display font-semibold">
                    Join your campus
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right column — orbit visual */}
            <div className="flex items-center justify-center">
              <div
                className="relative w-full"
                style={{ maxWidth: 420, aspectRatio: "1 / 1" }}
                aria-hidden="true"
              >
                {/* Outer dashed ring */}
                <div
                  className="absolute inset-0 rounded-full border border-dashed border-white/10"
                />
                {/* Inner ring */}
                <div
                  className="absolute rounded-full border border-campus-500/15"
                  style={{ inset: "13%" }}
                />

                {/* Ambient particles */}
                <div
                  className="absolute h-1 w-1 rounded-full bg-campus-500/50"
                  style={{ top: "12%", left: "20%", animation: "uv-blink 7s ease-in-out infinite" }}
                />
                <div
                  className="absolute h-1 w-1 rounded-full bg-campus-500/40"
                  style={{ top: "70%", left: "82%", animation: "uv-blink 7s ease-in-out 2s infinite" }}
                />
                <div
                  className="absolute h-1 w-1 rounded-full bg-campus-500/30"
                  style={{ top: "82%", left: "30%", animation: "uv-blink 7s ease-in-out 4s infinite" }}
                />

                {/* Orbit core */}
                <div
                  className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, rgba(74,222,128,0.95), rgba(22,163,74,0.65) 60%, rgba(22,163,74,0.14) 100%)",
                    animation: "uv-pulse 4.5s ease-in-out infinite",
                  }}
                >
                  <span className="font-display text-[0.7rem] font-bold tracking-widest text-black/80">
                    ORBIT
                  </span>
                </div>

                {/* Spinning ring with nodes */}
                <div
                  className="uv-orbit-spin absolute inset-0"
                  style={{ animation: "uv-spin 48s linear infinite" }}
                >
                  {[
                    { label: "Orbit",    icon: "🪐", pos: { top: "4%",  left: "50%"   } },
                    { label: "Study",    icon: "📚", pos: { top: "27%", left: "89.84%" } },
                    { label: "Chat",     icon: "💬", pos: { top: "73%", left: "89.84%" } },
                    { label: "Tribes",   icon: "👥", pos: { top: "96%", left: "50%"   } },
                    { label: "Whisper",  icon: "🤫", pos: { top: "73%", left: "10.16%" } },
                    { label: "AI Tutor", icon: "🤖", pos: { top: "27%", left: "10.16%" } },
                  ].map(({ label, icon, pos }) => (
                    <div
                      key={label}
                      className="uv-orbit-node absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        ...pos,
                        animation: "uv-spin-rev 48s linear infinite",
                      }}
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-campus-500/35 bg-background text-lg"
                        style={{ boxShadow: "0 0 16px -4px rgba(34,197,94,0.45)" }}
                      >
                        {icon}
                      </div>
                      <span className="mt-1 block text-center font-display text-[0.55rem] font-bold uppercase tracking-wider text-slate-500">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          WHAT IS UNIVERSE
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-campus-400">
            01 · Overview
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Campus life is scattered across too many apps.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Students communicate in one place, find study materials somewhere else, manage
            communities somewhere else, and ask questions through disconnected threads.
            UniVerse brings all of that into a single environment built specifically
            around your university.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div className="uv-glass rounded-2xl p-6">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <h3 className="font-display text-base font-bold text-foreground">
              ICOS — Integrated Campus Operating System
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              The architecture behind UniVerse — a connected digital environment designed
              around every ecosystem of campus life: social, academic, communication, and
              collaboration.
            </p>
          </div>

          <div
            className="rounded-2xl border p-6"
            style={{
              borderColor: "rgba(34,197,94,0.25)",
              background: "rgba(34,197,94,0.04)",
            }}
          >
            <div
              className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl text-campus-400"
              style={{ background: "rgba(34,197,94,0.14)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83"/></svg>
            </div>
            <h3 className="font-display text-base font-bold text-foreground">
              UniVerse ICOS v1.0
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              The first live layer of that vision — a focused MVP built around six
              core systems, starting with pilot campuses in Nigeria and growing from here.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          ECOSYSTEM — 6 features
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-campus-400">
              02 · The Ecosystem
            </p>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Six systems. One campus.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-slate-400">
              The six core layers that make up UniVerse ICOS v1.0.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ECOSYSTEM.map((item, i) => (
              <div
                key={item.name}
                className="group rounded-2xl border border-surface-200 bg-surface-100/60 p-5 transition-all duration-200 hover:border-campus-500/30 hover:bg-surface-100"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{ background: "rgba(34,197,94,0.10)" }}
                  >
                    {item.icon}
                  </div>
                  <span className="font-display text-[0.58rem] font-bold text-slate-600">
                    0{i + 1}
                  </span>
                </div>
                <p className="mb-1 font-display text-[0.62rem] font-bold uppercase tracking-widest text-campus-500">
                  {item.label}
                </p>
                <h3 className="font-display text-base font-bold text-foreground">
                  {item.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          FINAL CTA
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Your campus is waiting.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Create your account, select your university, and step into a platform
            built specifically for Nigerian students.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" variant="default" className="font-display font-semibold">
                Join UniVerse
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
