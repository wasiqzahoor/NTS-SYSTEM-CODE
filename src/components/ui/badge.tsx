"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple";
  size?: "sm" | "default";
}

function Badge({ className, variant = "default", size = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default:     "bg-foreground/10 text-foreground border border-foreground/15",
    secondary:   "bg-secondary text-secondary-foreground border border-border/60",
    destructive: "bg-red-500/10 text-red-500 border border-red-500/20",
    outline:     "bg-transparent text-foreground border border-border",
    success:     "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    warning:     "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    info:        "bg-nts-cyan/10 text-nts-cyan border border-nts-cyan/20",
    purple:      "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  };

  const sizes: Record<string, string> = {
    sm:      "px-2 py-0 text-[10px] h-5",
    default: "px-2.5 py-0.5 text-xs h-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold tracking-wide transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
