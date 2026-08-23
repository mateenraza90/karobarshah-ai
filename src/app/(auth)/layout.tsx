import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ledger p-10 lg:flex">
        <div className="ledger-lines pointer-events-none absolute inset-0" />
        <Logo variant="light" className="relative" />
        <blockquote className="relative max-w-sm">
          <p className="font-display text-2xl font-medium text-ledger-foreground">
            Every missed call is a lead your competitor just picked up.
          </p>
          <footer className="mt-3 text-sm text-ledger-foreground/70">
            Hire your first AI employee in minutes.
          </footer>
        </blockquote>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
