import Link from "next/link";

import { SignupForm } from "@/features/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">Set up your business in a couple of minutes.</p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ledger hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
