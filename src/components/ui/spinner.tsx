import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: "size-4",
  md: "size-5",
  lg: "size-8",
} as const;

export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZE_MAP;
  className?: string;
}) {
  return (
    <Loader2
      className={cn("animate-spin", SIZE_MAP[size], className)}
      aria-hidden="true"
    />
  );
}
