"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

import type { ActionState } from "@/types";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-clay">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="mt-2 text-sm text-ledger">
          {state.message}
        </p>
      )}
    </form>
  );
}
