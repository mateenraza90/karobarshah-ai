import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  id,
  label,
  errors,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  hint?: string;
  className?: string;
  children: React.ReactElement;
}) {
  const hasError = !!errors?.length;
  const describedBy = hasError ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, {
        id,
        "aria-invalid": hasError || undefined,
        "aria-describedby": describedBy,
      } as React.HTMLAttributes<HTMLElement>)}
      {hint && !hasError && (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={`${id}-error`} className="text-xs text-clay">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
