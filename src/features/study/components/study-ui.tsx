import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

/**
 * Shared compact presentation primitives for the Study module.
 * Presentation only — no data fetching, no behavior.
 *
 * Visual system: dark atmospheric, restrained borders, compact spacing,
 * neon-green (campus) accent, rounded-lg/md, no nested floating cards.
 */

/** Compact section header: title + optional subtitle + inline actions, with a divider. */
export function StudySectionHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-surface-200 pb-2", className)}>
      <div className="flex items-baseline gap-2 min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle ? (
          <span className="truncate text-xs text-slate-500">{subtitle}</span>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Compact bordered notice used for loading / empty / error states. */
export function StudyNotice({
  children,
  tone = "muted",
  role,
  "aria-busy": ariaBusy,
  "aria-label": ariaLabel,
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "danger";
  role?: "alert" | "status";
  "aria-busy"?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <div
      role={role}
      aria-busy={ariaBusy}
      aria-label={ariaLabel}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "danger"
          ? "border-red-500/30 bg-red-500/5 text-red-400"
          : "border-surface-200 bg-surface-50/50 text-slate-400",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Inline metadata line with "·" separators, clipped to one line on small screens. */
export function StudyMeta({ items }: { items: Array<string | null | undefined> }) {
  const parts = items.filter((item): item is string => Boolean(item));
  if (parts.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-relaxed text-slate-500">
      {parts.map((part, index) => (
        <span key={`${index}-${part}`} className="flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden="true" className="text-surface-400">·</span> : null}
          <span className="truncate">{part}</span>
        </span>
      ))}
    </p>
  );
}

/** Compact select matching the study system (h-9, rounded-lg, no standalone card). */
export function StudySelect({
  "aria-label": ariaLabel,
  value,
  onChange,
  children,
  className,
}: {
  "aria-label": string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-9 rounded-lg border border-surface-300 bg-surface-50 px-2.5 text-xs text-foreground",
        className
      )}
    >
      {children}
    </select>
  );
}

/** Compact pill filter chip (same language as the course filters). */
export function StudyChip({
  label,
  pressed,
  onClick,
  tone = "neutral",
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  tone?: "neutral" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        pressed
          ? tone === "accent"
            ? "border-campus-500 bg-campus-500/10 text-campus-300"
            : "border-surface-400 bg-surface-200 text-foreground"
          : "border-surface-300 text-slate-400 hover:border-surface-400 hover:text-slate-300"
      )}
    >
      {label}
    </button>
  );
}

/** Skeleton pulse rows for list loading states. */
export function StudySkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50/50 p-3"
        >
          <div className="h-3 w-3 shrink-0 rounded-full bg-surface-200 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 rounded bg-surface-200 animate-pulse" />
            <div className="h-2 w-1/3 rounded bg-surface-200/70 animate-pulse" />
          </div>
          <div className="h-6 w-14 rounded bg-surface-200/70 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
