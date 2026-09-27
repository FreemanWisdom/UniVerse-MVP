import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { IconAlertTriangle, IconCheckCircle, IconSearch } from "@/components/admin/icons";

/**
 * Admin console design system — deliberately LIGHT and corporate, isolated
 * from the student app's dark/light theme. Do not use the shared surface or
 * campus tokens in here; the admin owns its own palette (white / slate / blue-600).
 */

/* ---------- Page header ---------- */

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ---------- Cards ---------- */

export function AdminCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AdminCardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

/* ---------- Stat cards ---------- */

export function AdminStatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const toneMap = {
    default: "bg-blue-50 text-blue-600",
    positive: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
  } as const;
  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        {icon ? (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneMap[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
    </AdminCard>
  );
}

/* ---------- Status pills ---------- */

export function AdminPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}) {
  const toneMap = {
    neutral: "bg-slate-100 text-slate-600",
    info: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        toneMap[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Alerts / feedback ---------- */

export function AdminAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "warning";
  children: React.ReactNode;
}) {
  const map = {
    error: { wrap: "border-red-200 bg-red-50 text-red-700", icon: <IconAlertTriangle size={14} /> },
    success: { wrap: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <IconCheckCircle size={14} /> },
    warning: { wrap: "border-amber-200 bg-amber-50 text-amber-800", icon: <IconAlertTriangle size={14} /> },
  } as const;
  const style = map[tone];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm", style.wrap)} role={tone === "error" ? "alert" : "status"}>
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ---------- Empty & loading states ---------- */

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <IconSearch size={18} />
      </span>
      <p className="mt-4 text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

export function AdminLoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Buttons ---------- */

export type AdminButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "dangerSoft";

export function AdminButton({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: "sm" | "md";
}) {
  const variantMap = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    dangerSoft: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-400",
    ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400",
  } as const;
  const sizeMap = {
    sm: "h-8 px-2.5 text-xs",
    md: "h-9 px-3.5 text-sm",
  } as const;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        variantMap[variant],
        sizeMap[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------- Inputs ---------- */

export function AdminInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function AdminTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function AdminSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function AdminSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  label: string;
  busy?: boolean;
}) {
  return (
    <form
      className="relative flex w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <IconSearch size={15} />
      </span>
      <AdminInput
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-9"
      />
      {onSubmit ? (
        <AdminButton type="submit" variant="secondary" size="sm" className="ml-2 shrink-0" disabled={busy}>
          Search
        </AdminButton>
      ) : null}
    </form>
  );
}

/* ---------- Tables ---------- */

export function AdminTableWrap({ children }: { children: React.ReactNode }) {
  return (
    <AdminCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    </AdminCard>
  );
}

export function AdminTH({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th className={cn("border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500", className)}>
      {children}
    </th>
  );
}

export function AdminTD({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn("border-b border-slate-100 px-4 py-3 text-slate-700", className)}>{children}</td>;
}

/* ---------- Segmented tabs ---------- */

export function AdminSegmented({
  items,
  active,
  onSelect,
  ariaLabel,
}: {
  items: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onSelect: (key: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
