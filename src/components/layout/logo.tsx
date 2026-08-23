import { cn } from "@/lib/utils";

export function Logo({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-lg font-semibold tracking-tight",
        variant === "dark" ? "text-ink" : "text-ledger-foreground",
        className,
      )}
    >
      KarobarShah <span className="text-brass">AI</span>
    </span>
  );
}
