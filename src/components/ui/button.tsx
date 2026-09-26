import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-campus-500 text-black hover:bg-campus-400": variant === "default",
            "bg-surface-200 text-foreground hover:bg-surface-300": variant === "secondary",
            "border border-surface-300 bg-transparent text-foreground hover:bg-surface-100": variant === "outline",
            "bg-transparent text-foreground hover:bg-surface-200": variant === "ghost",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
