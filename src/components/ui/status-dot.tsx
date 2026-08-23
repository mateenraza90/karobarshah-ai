import { cn } from "@/lib/utils";

const TONE_MAP = {
  active: "bg-brass",
  idle: "bg-mist-strong",
  attention: "bg-clay",
} as const;

/**
 * A small status indicator. Used sparingly today (current nav section,
 * settings state) but deliberately established now: from Milestone 2
 * onward, this same dot marks whether an AI Employee is active — one
 * consistent visual language across the product instead of a bespoke
 * indicator invented later per feature.
 */
export function StatusDot({
  tone = "idle",
  className,
  label,
}: {
  tone?: keyof typeof TONE_MAP;
  className?: string;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn("size-1.5 rounded-full", TONE_MAP[tone], className)}
        aria-hidden="true"
      />
      {label && <span className="text-xs text-ink-muted">{label}</span>}
    </span>
  );
}
