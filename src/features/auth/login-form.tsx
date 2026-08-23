"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { login } from "@/features/auth/actions";
import { useActionToast } from "@/hooks/use-action-toast";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, null);
  useActionToast(state);

  return (
    <form action={action} className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}

      <FormField id="email" label="Email" errors={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" placeholder="you@business.com" required />
      </FormField>

      <FormField id="password" label="Password" errors={state?.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </FormField>

      <div className="-mt-2 flex justify-end">
        <Link href="/forgot-password" className="text-sm text-ledger hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" isLoading={pending} className="w-full">
        Log in
      </Button>
    </form>
  );
}
