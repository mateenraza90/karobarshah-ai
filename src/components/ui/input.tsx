import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-mist-strong bg-paper-raised px-3 text-sm text-ink placeholder:text-ink-muted",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:border-brass",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-clay aria-invalid:focus-visible:ring-clay",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
