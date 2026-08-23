"use client";

import Link from "next/link";

export function OnboardingProgress({ steps, current }: { steps: string[]; current: number }) {
  return <nav aria-label="Onboarding progress" className="grid grid-cols-3 gap-2 sm:grid-cols-6">{steps.map((step, index) => { const n=index+1; const active=n===current; const done=n<current; return <Link key={step} href={n <= current ? `/onboarding?step=${n}` : "#"} aria-current={active ? "step" : undefined} className={`rounded-md border px-2 py-2 text-center text-xs ${active ? "border-ledger bg-ledger/5 text-ledger" : done ? "border-mist-strong text-ink" : "border-mist text-ink-muted"}`}>{n}. {step}</Link>; })}</nav>;
}
