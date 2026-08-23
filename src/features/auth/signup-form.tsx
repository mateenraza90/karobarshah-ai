"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signup } from "@/features/auth/actions";
import { useActionToast } from "@/hooks/use-action-toast";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, null);
  useActionToast(state);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormField
        id="businessName"
        label="Business name"
        errors={state?.fieldErrors?.businessName}
      >
        <Input name="businessName" autoComplete="organization" placeholder="Al-Shifa Clinic" required />
      </FormField>

      <FormField id="email" label="Email" errors={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" placeholder="you@business.com" required />
      </FormField>

      <FormField
        id="password"
        label="Password"
        errors={state?.fieldErrors?.password}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input name="password" type="password" autoComplete="new-password" required />
      </FormField>

      <Button type="submit" isLoading={pending} className="w-full">
        Create account
      </Button>
    </form>
  );
}
