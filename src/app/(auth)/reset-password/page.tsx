import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Choose a new password</h1>
        <p className="mt-1 text-sm text-ink-muted">Make it something you haven&apos;t used before.</p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
