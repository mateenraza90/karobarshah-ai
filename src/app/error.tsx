"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Placeholder for real error reporting (e.g. Sentry) — out of scope
    // for Milestone 0, but this is the single place it will plug in.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="font-mono text-sm text-clay">Error</p>
      <h1 className="font-display text-2xl font-semibold text-ink">Something went wrong</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        That&apos;s on us, not you. Try again, and if it keeps happening, let us know what you
        were doing.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
