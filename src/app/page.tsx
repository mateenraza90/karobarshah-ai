import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { APP_TAGLINE } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-paper px-6 text-center">
      <Logo />
      <div className="max-w-md">
        <h1 className="font-display text-3xl font-semibold text-ink">{APP_TAGLINE}</h1>
        <p className="mt-3 text-ink-muted">
          Hire AI employees for reception, booking, follow-up, and more — built for Pakistan
          first.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </main>
  );
}
