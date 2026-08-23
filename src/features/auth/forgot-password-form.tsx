"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/features/auth/actions";
import { useActionToast } from "@/hooks/use-action-toast";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  useActionToast(state);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormField id="email" label="Email" errors={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" placeholder="you@business.com" required />
      </FormField>

      <Button type="submit" isLoading={pending} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
