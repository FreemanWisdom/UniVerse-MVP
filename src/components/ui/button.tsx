import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.97]",
          {
            // Variants
            "bg-campus-500 text-black hover:bg-campus-400 shadow-[0_0_0_1px_rgba(34,197,94,0.2),0_4px_16px_-4px_rgba(34,197,94,0.35)]":
              variant === "default",
            "bg-surface-200 text-foreground hover:bg-surface-300":
              variant === "secondary",
            "border border-surface-300 bg-transparent text-foreground hover:bg-surface-100 hover:border-surface-400":
              variant === "outline",
            "bg-transparent text-foreground hover:bg-surface-200":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-500":
              variant === "destructive",
            // Sizes
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
