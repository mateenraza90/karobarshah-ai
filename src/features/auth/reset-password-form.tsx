"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/features/auth/actions";
import { useActionToast } from "@/hooks/use-action-toast";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, null);
  useActionToast(state);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormField
        id="password"
        label="New password"
        errors={state?.fieldErrors?.password}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input name="password" type="password" autoComplete="new-password" required />
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm new password"
        errors={state?.fieldErrors?.confirmPassword}
      >
        <Input name="confirmPassword" type="password" autoComplete="new-password" required />
      </FormField>

      <Button type="submit" isLoading={pending} className="w-full">
        Update password
      </Button>
    </form>
  );
}
