"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm",
          "text-foreground placeholder:text-muted-foreground",
          "ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nts-cyan/50 focus-visible:ring-offset-1 focus-visible:border-nts-cyan/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-150",
          "dark:bg-white/[0.04] dark:border-white/10 dark:text-white dark:placeholder:text-white/30",
          "dark:focus-visible:bg-white/[0.06] dark:focus-visible:border-nts-cyan/40",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
