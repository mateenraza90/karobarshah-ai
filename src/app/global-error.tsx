"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * error.tsx only catches errors thrown below the root layout — it can't
 * catch an error thrown by the root layout itself (src/app/layout.tsx).
 * Only global-error.tsx can, and because it replaces the root layout
 * entirely when active, it must render its own complete <html>/<body>
 * and avoid depending on anything the failing layout might also depend
 * on (fonts, ThemeProvider, etc.) — kept intentionally minimal here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
          <p className="font-mono text-sm text-clay">Error</p>
          <h1 className="text-2xl font-semibold text-ink">Something went wrong</h1>
          <p className="max-w-sm text-sm text-ink-muted">
            That&apos;s on us, not you. Try again, and if it keeps happening, let us know what
            you were doing.
          </p>
          <Button onClick={reset}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
