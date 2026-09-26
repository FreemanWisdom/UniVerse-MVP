import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "campus";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "bg-surface-200 text-foreground": variant === "default" || variant === "secondary",
          "border border-surface-300 text-slate-300": variant === "outline",
          "bg-campus-950 text-campus-400 border border-campus-800": variant === "campus",
        },
        className
      )}
      {...props}
    />
  );
}
