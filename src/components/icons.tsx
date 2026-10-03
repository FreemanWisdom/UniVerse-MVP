import * as React from "react";

/**
 * Inline stroke icons for the student app (lucide-style, 24x24, no deps).
 * Mirrors the admin icon set (src/components/admin/icons.tsx) so the whole
 * product shares one visual language: currentColor, stroke 1.75, round caps.
 *
 * Usage: pass `size` (default 16) and standard SVG props (className, fill…).
 * For "active" states pass fill="currentColor" on Heart/Bookmark.
 */
type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, strokeWidth = 1.75, ...props }: IconProps, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Orbit — planet with ring (the product mark) */
export const IconPlanet = (p: IconProps) =>
  base(p, <><circle cx="12" cy="12" r="6" /><path d="M18.4 8.5c2.2-1 4-1 4.6-.3.7 1-1.3 3.4-4.6 5.9" /><path d="M5.6 15.5c-2.2 1-4 1-4.6.3-.7-1 1.3-3.4 4.6-5.9" /><path d="M21.9 14.1c.2-1.7-3.3-4.6-8-6.6S4.5 5.4 3.4 6.6" /><path d="M2.1 9.9c-.2 1.7 3.3 4.6 8 6.6s9.4 2.1 10.5.9" /></>);

/** Study Hub — books */
export const IconBooks = (p: IconProps) =>
  base(p, <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M9 7h7" /><path d="M9 11h7" /></>);

/** Campus Chat — message bubble */
export const IconChat = (p: IconProps) =>
  base(p, <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /><path d="M8 12h.01" /><path d="M12 12h.01" /><path d="M16 12h.01" /></>);

/** Study Tribes — users */
export const IconUsers = (p: IconProps) =>
  base(p, <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);

/** Campus Whisper — anonymous mask */
export const IconWhisper = (p: IconProps) =>
  base(p, <><circle cx="12" cy="12" r="10" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8.5 15.5s1 1 3.5 1 3.5-1 3.5-1" /></>);

/** AI Tutor — robot */
export const IconBot = (p: IconProps) =>
  base(p, <><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></>);

/** Settings — gear */
export const IconSettings = (p: IconProps) =>
  base(p, <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73 2 2 0 0 0-.25.99v.37a2 2 0 0 0 1 1.73l.15.08a2 2 0 0 1 1 1.73v.18a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-1 1.73v.37a2 2 0 0 0 .25.99 2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73 2 2 0 0 0 .25-.99v-.37a2 2 0 0 0-1-1.73l-.15-.08a2 2 0 0 1-1-1.73v-.18a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 1-1.73v-.37a2 2 0 0 0-.25-.99 2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>);

/** Notifications — bell */
export const IconBell = (p: IconProps) =>
  base(p, <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>);

/** Composer — camera */
export const IconCamera = (p: IconProps) =>
  base(p, <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>);

/** Orbit like — heart (pass fill="currentColor" when active) */
export const IconHeart = (p: IconProps) =>
  base(p, <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" /></>);

/** Orbit comments — message square */
export const IconMessageSquare = (p: IconProps) =>
  base(p, <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>);

/** Orbit save — bookmark (pass fill="currentColor" when active) */
export const IconBookmark = (p: IconProps) =>
  base(p, <><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></>);

/** Theme — sun */
export const IconSun = (p: IconProps) =>
  base(p, <><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></>);

/** Theme — moon */
export const IconMoon = (p: IconProps) =>
  base(p, <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" /></>);

/** Brand sparkle — replaces the ✦ glyph */
export const IconSparkle = (p: IconProps) =>
  base(p, <><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" /></>);

/** Onboarding — rocket */
export const IconRocket = (p: IconProps) =>
  base(p, <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.43-2.14 2-3c.68-.32 2-.5 3 .5 1 1 1 2.32 1 2.5" /><path d="M12 15v5s2.14-.43 3-2c.32-.68.5-2-.5-3-1-1-2.32-1-2.5-1" /></>);

/** Onboarding — graduation cap */
export const IconGraduationCap = (p: IconProps) =>
  base(p, <><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>);

/** Report / flag an item */
export const IconFlag = (p: IconProps) =>
  base(p, <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></>);

/** Share — send to another user */
export const IconShare = (p: IconProps) =>
  base(p, <><path d="M12 3v13" /><path d="M8 7 12 3l4 4" /><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /></>);

/** Link out — external profile / open */
export const IconExternal = (p: IconProps) =>
  base(p, <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>);

/** Send — paper plane (tribe/tutor composers) */
export const IconSend = (p: IconProps) =>
  base(p, <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>);

/** File — document with lines (study resources) */
export const IconFileText = (p: IconProps) =>
  base(p, <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" /><path d="M14.5 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /></>);

/** Chevron right — inline affordance for links */
export const IconChevronRight = (p: IconProps) =>
  base(p, <><path d="m9 18 6-6-6-6" /></>);

/** Star — reputation / ratings */
export const IconStar = (p: IconProps) =>
  base(p, <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />);

/** X / close */
export const IconX = (p: IconProps) =>
  base(p, <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);

/** Pencil — edit */
export const IconPencil = (p: IconProps) =>
  base(p, <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></>);

/** ID card — identity section */
export const IconIdCard = (p: IconProps) =>
  base(p, <><path d="M16 10h2" /><path d="M16 14h2" /><path d="M6.17 15a3 3 0 0 1 5.66 0" /><circle cx="9" cy="11" r="2" /><path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2Z" /></>);

/** Bed — Lodge Finder */
export const IconBed = (p: IconProps) =>
  base(p, <><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></>);

/** Car — Errand Hub */
export const IconCar = (p: IconProps) =>
  base(p, <><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>);

/** Clipboard list — survey */
export const IconClipboardList = (p: IconProps) =>
  base(p, <><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>);

/** Logout — door with arrow */
export const IconLogout = (p: IconProps) =>
  base(p, <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>);
