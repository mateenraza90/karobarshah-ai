import Link from "next/link";

import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Enter the email on your account and we&apos;ll send a reset link.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-ink-muted">
        <Link href="/login" className="text-ledger hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
