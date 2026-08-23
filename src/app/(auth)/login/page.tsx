import Link from "next/link";

import { LoginForm } from "@/features/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmEmail?: string; next?: string }>;
}) {
  const { confirmEmail, next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Log in</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Welcome back — let&apos;s see how your AI employees did.
        </p>
      </div>

      {confirmEmail && (
        <p role="status" className="rounded-md border border-mist bg-mist/40 p-3 text-sm text-ink">
          Check your email to confirm your account before logging in.
        </p>
      )}

      <LoginForm next={next} />

      <p className="text-center text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-ledger hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
