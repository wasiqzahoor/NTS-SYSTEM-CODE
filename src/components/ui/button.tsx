"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "primary" | "secondary";
  size?: "default" | "sm" | "lg" | "icon" | "xs";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-foreground text-background hover:bg-foreground/90 shadow-sm",
      destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
      outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-nts-cyan underline-offset-4 hover:underline p-0 h-auto",
      primary:
        "bg-nts-cyan text-[#050810] hover:bg-nts-cyan/90 font-semibold shadow-sm shadow-nts-cyan/20 hover:shadow-nts-cyan/30 hover:shadow-md",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60",
    };

    const sizes: Record<string, string> = {
      default: "h-9 px-4 text-sm",
      sm:      "h-8 px-3 text-xs",
      xs:      "h-7 px-2.5 text-xs",
      lg:      "h-11 px-6 text-sm font-semibold",
      icon:    "h-9 w-9",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium",
          "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nts-cyan/50 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading…</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
