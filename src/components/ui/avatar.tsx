import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/format";

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-ledger font-display text-sm font-semibold text-ledger-foreground",
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
