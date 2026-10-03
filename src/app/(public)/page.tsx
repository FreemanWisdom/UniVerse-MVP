import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  IconPlanet,
  IconBooks,
  IconChat,
  IconUsers,
  IconWhisper,
  IconBot,
} from "@/components/icons";

/** Icon per system — one visual language, no UI emojis. */
const SYSTEM_ICONS = {
  Orbit: IconPlanet,
  "Study Hub": IconBooks,
  "Campus Chat": IconChat,
  "Study Tribes": IconUsers,
  "Campus Whisper": IconWhisper,
  "AI Tutor": IconBot,
} as const;

/*
 * Universe ICOS public home page.
 *
 * All written copy is ported word-for-word from the legacy HTML landing
 * page (index.html, the page deployed at universeicos.app), with the
 * product name corrected to "Universe ICOS" per brand direction.
 * Old team photographs are intentionally NOT ported; the team section
 * keeps names and roles only.
 *
 * The orbit visual keeps the CSS-transform animation system (uv-spin /
 * uv-spin-rev) already present in globals.css, with "ICOS" at the center
 * and the six systems sharing one coordinated orbital ring.
 * prefers-reduced-motion pauses all of it (globals.css).
 */

export const metadata: Metadata = {
  title: "Universe ICOS — The Integrated Campus Operating System",
  description:
    "Universe ICOS is building an Integrated Campus Operating System for campus life, connecting students across communication, learning, communities and campus experiences.",
};

const SYSTEMS = [
  {
    number: "01",
    layer: "Social Layer",
    name: "Orbit",
    tagline: "Your campus, in motion.",
    description:
      "The social layer of Universe ICOS — discover conversations, people and activity happening around your campus.",
    status: "System 01 / Active",
  },
  {
    number: "02",
    layer: "Academic Layer",
    name: "Study Hub",
    tagline: "Everything you need to study smarter.",
    description:
      "Your academic command center — access learning resources, study materials and tools built around your coursework.",
    status: "System 02 / Active",
  },
  {
    number: "03",
    layer: "Communication Layer",
    name: "Campus Chat",
    tagline: "Direct campus communication.",
    description:
      "Communicate directly with other students inside your campus ecosystem — no separate app required.",
    status: "System 03 / Active",
  },
  {
    number: "04",
    layer: "Collaboration Layer",
    name: "Study Tribes",
    tagline: "Learn together. Go further.",
    description:
      "Create or join focused learning communities and study with people pursuing the same goals.",
    status: "System 04 / Active",
  },
  {
    number: "05",
    layer: "Anonymous Layer",
    name: "Campus Whisper",
    tagline: "Say it without your name.",
    description:
      "A space for anonymous posts — where students can share what's really on their mind and read what's being said across campus, without attaching their identity.",
    status: "System 05 / Active",
  },
  {
    number: "06",
    layer: "Intelligence Layer",
    name: "AI Tutor",
    tagline: "Ask anything. Learn faster.",
    description:
      "An AI-powered study assistant built into your academic layer — get explanations, work through concepts and get unstuck without waiting for office hours.",
    status: "System 06 / Active",
  },
];

const ORBIT_NODES = [
  { label: "Orbit", pos: { top: "4%", left: "50%" } },
  { label: "Study Hub", pos: { top: "27%", left: "89.84%" } },
  { label: "Campus Chat", pos: { top: "73%", left: "89.84%" } },
  { label: "Study Tribes", pos: { top: "96%", left: "50%" } },
  { label: "Campus Whisper", pos: { top: "73%", left: "10.16%" } },
  { label: "AI Tutor", pos: { top: "27%", left: "10.16%" } },
];

const MVP_ITEMS = [
  { name: "Orbit", action: "Connect." },
  { name: "Study Hub", action: "Learn." },
  { name: "Campus Chat", action: "Communicate." },
  { name: "Study Tribes", action: "Collaborate." },
  { name: "Campus Whisper", action: "Express." },
  { name: "AI Tutor", action: "Ask." },
];

const HOW_IT_WORKS = [
  {
    title: "Choose your campus",
    body: "Select your university to join its dedicated campus ecosystem.",
  },
  {
    title: "Create your Universe ICOS identity",
    body: "Verify your university email and set up your profile.",
  },
  {
    title: "Enter your campus ecosystem",
    body: "Step into the Universe ICOS experience built around your university.",
  },
  {
    title: "Connect. Learn. Communicate. Collaborate. Express. Ask.",
    body: "Use Orbit, Study Hub, Campus Chat, Study Tribes, Campus Whisper and AI Tutor.",
  },
];

const PILOT_CAMPUSES = [
  "University of Agriculture and Environmental Sciences (UAES)",
  "Alex Ekwueme Federal University Ndufu-Alike (FUNAI)",
  "Federal University of Technology, Owerri (FUTO)",
  "Michael Okpara University of Agriculture, Umudike (MOUAU)",
  "University of Nigeria, Nsukka (UNN)",
];

const TEAM = [
  { name: "Victory Munachimso", role: "Founder & CEO" },
  { name: "Freeman Wisdom Chinazaekpere", role: "Co Founder & COO" },
  { name: "Ndukwu Chinedu Charles", role: "DMD" },
  { name: "Onyeghala Chinemerem Stephanie", role: "Director of Growth & Advertisement" },
  { name: "Jonathan Okorie", role: "Project Manager" },
  { name: "Mong Gospel Kalu", role: "Secretary & Compliance Officer" },
];

const TIMELINE = [
  { year: "2026", title: "Universe ICOS founded." },
  { year: "2026", title: "Universe ICOS V1.0 developed." },
  { year: "2026", title: "V1.0 launched across five Nigerian pilot campuses." },
  { year: "2026 →", title: "Campus network and ecosystem development." },
  { year: "Future", title: "Expansion of the broader ICOS ecosystem." },
];

const FAQS = [
  {
    q: "What does ICOS mean?",
    a: "ICOS means Integrated Campus Operating System.",
  },
  {
    q: "What is Universe ICOS?",
    a: "Universe ICOS is a student-focused Integrated Campus Operating System designed to connect communication, learning, communities and campus experiences within one digital ecosystem.",
  },
  {
    q: "Is Universe ICOS live?",
    a: "Yes. Universe ICOS V1.0 is live.",
  },
  {
    q: "What is included in V1.0?",
    a: "V1.0 includes Orbit, Campus Chat, Study Tribes, AI Tutor, Campus Whisper and Study Hub.",
  },
  {
    q: "Which universities are currently part of V1.0?",
    a: "V1.0 is currently launching across UAES, FUNAI, FUTO, MOUAU and UNN.",
  },
  {
    q: "Where is Universe ICOS starting?",
    a: "Universe ICOS is starting with Nigerian universities, with a long-term vision for expansion across Africa.",
  },
  {
    q: "Who founded Universe ICOS?",
    a: "Universe ICOS was founded by Victory Munachimso, who serves as Founder & CEO.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-campus-400">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Supabase recovery links land on the project's site URL (the root of
  // this site) whenever the requested redirect target isn't allowlisted.
  // Forward any recovery credentials to the dedicated reset page.
  const params = await searchParams;
  const isRecovery =
    typeof params.code === "string" ||
    (typeof params.token_hash === "string" && params.type === "recovery");
  if (isRecovery) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    redirect(`/reset-password${query.size ? `?${query.toString()}` : ""}`);
  }

  return (
    <>
      {/* ================================================================
          HERO
          ================================================================ */}
      <section id="overview" className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* Left column — copy & CTAs */}
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-campus-500/25 px-3.5 py-1.5">
                  <span
                    className="uv-blink-el h-1.5 w-1.5 rounded-full bg-campus-500"
                    style={{ animation: "uv-blink 2.4s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  <span className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-campus-400">
                    Universe ICOS · Version 1.0
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 font-display text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
                  MVP · First Campus Layer
                </div>
              </div>

              <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                The Integrated<br />
                <span className="bg-gradient-to-br from-campus-400 to-campus-600 bg-clip-text text-transparent">
                  Campus Operating System.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
                Universe ICOS is building a student-centered digital
                infrastructure for campus life — connecting communication,
                learning, communities and campus experiences within one
                connected ecosystem.
              </p>

              <p className="mt-4 border-l-2 border-campus-500/40 pl-4 text-sm leading-relaxed text-slate-500">
                <strong className="font-medium text-slate-300">
                  V1.0 MVP IS LIVE
                </strong>{" "}
                — starting with five pilot campuses in Nigeria.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/login">
                  <Button size="lg" variant="default" className="font-display font-semibold">
                    Enter Universe ICOS
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline">
                    Join the V1.0
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right column — orbit visual (ICOS at the center) */}
            <div className="flex items-center justify-center">
              <div
                className="relative aspect-square w-full max-w-[300px] sm:max-w-[380px] lg:max-w-[460px]"
                aria-hidden="true"
              >
                {/* Conceptual layer labels */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                  Social
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                  Academic
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                  Communication
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                  Collaboration
                </div>

                {/* Rings */}
                <div className="absolute inset-0 rounded-full border border-dashed border-white/10" />
                <div
                  className="absolute rounded-full border border-campus-500/15"
                  style={{ inset: "13%" }}
                />

                {/* Ambient particles */}
                <div
                  className="uv-blink-el absolute h-1 w-1 rounded-full bg-campus-500/50"
                  style={{ top: "12%", left: "20%", animation: "uv-blink 7s ease-in-out infinite" }}
                />
                <div
                  className="uv-blink-el absolute h-1 w-1 rounded-full bg-campus-500/40"
                  style={{ top: "70%", left: "82%", animation: "uv-blink 7s ease-in-out 2s infinite" }}
                />
                <div
                  className="uv-blink-el absolute h-1 w-1 rounded-full bg-campus-500/30"
                  style={{ top: "82%", left: "30%", animation: "uv-blink 7s ease-in-out 4s infinite" }}
                />

                {/* ICOS core — the center of the orbit */}
                <div
                  className="uv-orbit-core absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, rgba(74,222,128,0.95), rgba(22,163,74,0.65) 60%, rgba(22,163,74,0.14) 100%)",
                    animation: "uv-pulse 4.5s ease-in-out infinite",
                  }}
                >
                  <span className="font-display text-sm font-bold tracking-[0.08em] text-black/80">
                    ICOS
                  </span>
                </div>

                {/* One coordinated orbital ring: the six systems share the
                    same 48s rotation, each node counter-rotates to stay upright */}
                <div
                  className="uv-orbit-spin absolute inset-0"
                  style={{ animation: "uv-spin 48s linear infinite" }}
                >
                  {ORBIT_NODES.map(({ label, pos }) => (
                    <div
                      key={label}
                      className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2"
                      style={pos}
                    >
                      <div
                        className="uv-orbit-node relative h-11 w-11"
                        style={{ animation: "uv-spin-rev 48s linear infinite" }}
                      >
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-campus-500/35 bg-background text-lg"
                          style={{ boxShadow: "0 0 16px -4px rgba(34,197,94,0.45)" }}
                        >
                          {(() => {
                            const NodeIcon = SYSTEM_ICONS[label as keyof typeof SYSTEM_ICONS];
                            return NodeIcon ? <NodeIcon size={20} /> : null;
                          })()}
                        </div>
                        <span className="absolute left-1/2 top-full mt-1.5 hidden w-max -translate-x-1/2 text-center font-display text-[0.55rem] font-bold uppercase tracking-wider text-slate-500 min-[380px]:block">
                          {label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* You-are-here status panel */}
          <div className="uv-glass relative mt-16 overflow-hidden rounded-[2rem] p-7 sm:p-9">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 60% 100% at 0% 0%, rgba(34,197,94,0.10), transparent 60%)",
              }}
              aria-hidden="true"
            />
            <div className="relative grid gap-8 sm:grid-cols-4 sm:gap-6">
              <div>
                <p className="mb-2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Universe ICOS
                </p>
                <p className="font-display text-2xl font-bold text-foreground">
                  V1.0 <span className="text-campus-400">/ MVP</span>
                </p>
              </div>
              <div>
                <p className="mb-2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </p>
                <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-foreground">
                  <span className="uv-status-dot" aria-hidden="true" />Live / Pilot
                </p>
              </div>
              <div>
                <p className="mb-2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Current Layer
                </p>
                <p className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
                  The Core Campus Experience
                </p>
              </div>
              <div>
                <p className="mb-2 font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Focus
                </p>
                <p className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
                  Connect · Learn · Communicate · Collaborate · Express · Ask
                </p>
              </div>
              <div className="relative border-t border-white/5 pt-6 sm:col-span-4">
                <p className="text-sm text-slate-400">
                  The larger ICOS ecosystem will evolve beyond this first release.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          WHAT IS UNIVERSE — 01 · Overview
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading eyebrow="01 · Overview" title="The campus experience is fragmented.">
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Students currently move between separate platforms for conversations,
            academic resources, communities and campus interactions. Universe
            ICOS is designed to bring these experiences into one connected
            environment.
          </p>
        </SectionHeading>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
          <div className="uv-glass rounded-3xl p-6 sm:p-8">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <h3 className="mb-2 font-display text-lg font-bold text-foreground">
              ICOS — Integrated Campus Operating System
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              ICOS is the broader architecture behind Universe ICOS: a connected
              digital environment designed around the different ecosystems of
              campus life — social, academic, communication and collaboration.
            </p>
          </div>

          <div
            className="rounded-3xl border p-6 sm:p-8"
            style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.04)" }}
          >
            <div
              className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl text-campus-400"
              style={{ background: "rgba(34,197,94,0.14)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83"/></svg>
            </div>
            <h3 className="mb-2 font-display text-lg font-bold text-foreground">
              Universe ICOS v1.0
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Universe ICOS v1.0 is the first practical layer of that vision — a
              focused MVP built around six core systems, with the wider ICOS
              ecosystem expanding from here.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          COMPANY DEFINITION
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading eyebrow="Company Definition" title="What is Universe ICOS?">
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Universe ICOS is an Integrated Campus Operating System designed to
            bring the digital experiences of campus life into one connected
            ecosystem.
          </p>
        </SectionHeading>

        <div className="mx-auto mt-8 max-w-3xl text-center">
          <p className="text-base leading-relaxed text-slate-400">
            It connects students across communication, learning, collaboration,
            communities and campus interaction, beginning with Universe ICOS
            V1.0 and expanding toward a broader campus infrastructure.
          </p>
        </div>
      </section>

      {/* ================================================================
          WHY UNIVERSE EXISTS
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading eyebrow="Why Universe Exists" title="One campus. One connected digital environment.">
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Campus life has become digitally fragmented.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Students communicate in one place, study somewhere else, find
            communities somewhere else, and solve everyday problems through
            disconnected networks.
          </p>
          <p className="mt-4 text-base font-medium leading-relaxed text-foreground">
            Universe ICOS is being built to change that.
          </p>
        </SectionHeading>
      </section>

      {/* ================================================================
          02 · THE ECOSYSTEM — six systems
          ================================================================ */}
      <section id="ecosystem" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="02 · The Ecosystem" title="Six systems. One campus.">
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              The six core layers that make up Universe ICOS v1.0.
            </p>
          </SectionHeading>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SYSTEMS.map((item) => (
              <div
                key={item.name}
                className="group rounded-2xl border border-surface-200 bg-surface-100/60 p-5 transition-all duration-200 hover:border-campus-500/30 hover:bg-surface-100"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{ background: "rgba(34,197,94,0.10)" }}
                  >
                    {(() => {
                      const SysIcon = SYSTEM_ICONS[item.name as keyof typeof SYSTEM_ICONS];
                      return SysIcon ? <SysIcon size={18} /> : null;
                    })()}
                  </div>
                  <span className="font-display text-[0.58rem] font-bold text-slate-600">
                    {item.number}
                  </span>
                </div>
                <p className="mb-1 font-display text-[0.62rem] font-bold uppercase tracking-widest text-campus-500">
                  {item.layer}
                </p>
                <h3 className="font-display text-base font-bold text-foreground">
                  {item.name}
                </h3>
                <p className="mt-1 font-display text-sm font-medium text-slate-300">
                  {item.tagline}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.description}
                </p>
                <p className="mt-4 font-display text-[0.58rem] font-bold uppercase tracking-widest text-campus-500">
                  {item.status}
                </p>
              </div>
            ))}
          </div>

          {/* Everything connects */}
          <div className="mx-auto mt-16 max-w-3xl text-center">
            <h3 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything connects.
            </h3>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {["Students", "Conversations", "Study", "Communities", "Campus ecosystem"].map(
                (word, i, arr) => (
                  <span key={word} className="flex items-center gap-3">
                    <span className="rounded-full border border-campus-500/25 bg-campus-500/[0.06] px-4 py-1.5 font-display text-xs font-bold text-campus-400">
                      {word}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="text-campus-500/50" aria-hidden="true">
                        ↳
                      </span>
                    )}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          03 · V1.0 MVP
          ================================================================ */}
      <section id="v1" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="03 · V1.0 MVP" title={"What's actually in V1.0?"}>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              Six experiences. One focused MVP.
            </p>
          </SectionHeading>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MVP_ITEMS.map((item) => (
              <div
                key={item.name}
                className="uv-glass flex items-center justify-between rounded-2xl p-5"
              >
                <span className="font-display text-sm font-bold text-foreground">
                  {item.name}
                </span>
                <span className="font-display text-sm font-bold text-campus-400">
                  {item.action}
                </span>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl text-center">
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {"That's the MVP."}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              We&apos;re deliberately starting focused. V1.0 establishes the core
              experience before the broader ICOS ecosystem expands.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          04 · ROADMAP
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="04 · Roadmap" title="The larger vision comes next.">
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              V1.0 is intentionally focused. Universe ICOS is designed to grow
              into a broader campus operating system over time.
            </p>
          </SectionHeading>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-campus-500/30 bg-campus-500/[0.06] p-6">
              <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                V1.0
              </p>
              <p className="mt-2 font-display text-base font-bold text-foreground">Expanding</p>
              <p className="mt-2 text-sm text-slate-400">Campus Ecosystem</p>
            </div>
            <div className="uv-glass rounded-2xl p-6">
              <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Future Ecosystem
              </p>
              <p className="mt-2 font-display text-base font-bold text-foreground">
                Future ICOS Layers
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Coming as the platform evolves
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          05 · HOW IT WORKS
          ================================================================ */}
      <section id="how-it-works" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="05 · How It Works" title="How Universe ICOS works." />

          <ol className="mt-12 space-y-3">
            {HOW_IT_WORKS.map((step, i) => (
              <li
                key={step.title}
                className="uv-glass flex items-start gap-4 rounded-2xl p-5 sm:items-center"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-campus-500/35 bg-campus-500/10 font-display text-xs font-bold text-campus-400">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================================================================
          06 · COMMUNITY
          ================================================================ */}
      <section id="community" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="06 · Community" title="Built for a better campus community.">
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              Universe ICOS is designed to provide students with a connected
              environment where people can communicate, collaborate and
              participate responsibly.
            </p>
          </SectionHeading>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <Link
              href="/privacy"
              className="group rounded-2xl border border-surface-200 bg-surface-100/60 p-6 text-left transition-all duration-200 hover:border-campus-500/30 hover:bg-surface-100"
            >
              <h3 className="font-display text-base font-bold text-foreground">
                Privacy Policy
              </h3>
              <p className="mt-1 text-sm text-slate-400">How we handle your data.</p>
            </Link>
            <Link
              href="/community-standards"
              className="group rounded-2xl border border-surface-200 bg-surface-100/60 p-6 text-left transition-all duration-200 hover:border-campus-500/30 hover:bg-surface-100"
            >
              <h3 className="font-display text-base font-bold text-foreground">
                Community Standards
              </h3>
              <p className="mt-1 text-sm text-slate-400">The rules of the campus.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          PILOT CAMPUSES
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="Current Campus Network" title="V1.0 Pilot Campuses">
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              Universe ICOS V1.0 is currently launching across five pilot
              campuses in Nigeria.
            </p>
          </SectionHeading>

          <ol className="mt-12 space-y-3">
            {PILOT_CAMPUSES.map((campus, i) => (
              <li key={campus} className="uv-glass flex items-center gap-4 rounded-2xl p-5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-campus-500/35 bg-campus-500/10 font-display text-xs font-bold text-campus-400">
                  {i + 1}
                </span>
                <h3 className="font-display text-sm font-bold text-foreground sm:text-base">
                  {campus}
                </h3>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================================================================
          GEOGRAPHIC VISION
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-campus-400">
            Geographic Vision
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Built in Nigeria. Designed for Africa.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Universe ICOS begins with Nigerian universities, where students
            navigate fragmented systems for communication, learning, communities
            and everyday campus life.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            The long-term vision is to build infrastructure that can connect
            campus communities across Africa.
          </p>
        </div>
      </section>

      {/* ================================================================
          ABOUT UNIVERSE ICOS
          ================================================================ */}
      <section id="about" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-campus-400">
              Company
            </p>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              About Universe ICOS
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              Universe ICOS is a student-focused technology company building an
              Integrated Campus Operating System for the next generation of
              campus life.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              Founded in 2026, Universe ICOS began with a simple premise:
              students should not have to navigate disconnected platforms for
              every part of their campus experience.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              The company is starting with a focused V1.0 MVP across its first
              pilot campuses in Nigeria, with a long-term vision of developing
              a broader campus ecosystem.
            </p>
          </div>

          <aside className="uv-glass h-fit rounded-2xl p-6">
            <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-campus-400">
              Universe ICOS
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              {[
                ["Meaning", "Integrated Campus Operating System"],
                ["Founded", "2026"],
                ["Founder & CEO", "Victory Munachimso"],
                ["Co Founder & COO", "Freeman Wisdom Chinazaekpere"],
                ["Current Product", "Universe ICOS V1.0"],
                ["Current Market", "Nigerian Universities"],
                ["Long-Term Vision", "Africa"],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {term}
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {/* ================================================================
          TEAM — names and roles only; old team photos NOT ported
          ================================================================ */}
      <section id="team" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Built by" title="The Team Behind Universe ICOS">
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              Meet the people building and supporting the Universe ICOS
              ecosystem.
            </p>
          </SectionHeading>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <article key={member.name} className="uv-glass rounded-[1.75rem] p-6 text-center">
                <div
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-campus-500/35 bg-campus-500/10 font-display text-lg font-bold text-campus-400"
                  aria-hidden="true"
                >
                  {member.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </div>
                <h3 className="font-display text-lg font-bold leading-tight text-foreground sm:text-[1.35rem]">
                  {member.name}
                </h3>
                <p className="mt-2 font-display text-xs font-bold uppercase tracking-widest text-campus-400">
                  {member.role}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          TIMELINE
          ================================================================ */}
      <section id="timeline" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-campus-400">
            Company Timeline
          </p>
          <h2 className="mt-4 mb-12 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Universe ICOS Timeline
          </h2>

          <ol className="relative space-y-9 border-l border-white/10 pl-8">
            {TIMELINE.map((item) => (
              <li key={item.title} className="relative">
                <span
                  className="absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full bg-campus-500"
                  style={{ boxShadow: "0 0 0 4px rgba(34,197,94,0.12)" }}
                  aria-hidden="true"
                />
                <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-campus-400">
                  {item.year}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-foreground">
                  {item.title}
                </h3>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================================================================
          BEYOND V1.0
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-campus-400">
            Beyond V1.0
          </p>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            V1.0 is only the first layer.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Universe ICOS is being designed as an operating system for campus
            life — an infrastructure where communication, learning, communities
            and future campus services can exist within one connected ecosystem.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            As the network grows, additional ICOS layers will be introduced
            around the needs of students and their campuses.
          </p>
        </div>
      </section>

      {/* ================================================================
          FAQ
          ================================================================ */}
      <section id="faq" className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="Knowledge Base" title="Frequently asked questions" />

          <div className="mt-10 space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="uv-glass group rounded-2xl">
                <summary className="cursor-pointer list-none rounded-2xl p-5 font-display text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
                  {faq.q}
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          FINAL CTA
          ================================================================ */}
      <section className="border-t border-white/[0.05] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to enter your universe?
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" variant="default" className="font-display font-semibold">
                Create your account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
