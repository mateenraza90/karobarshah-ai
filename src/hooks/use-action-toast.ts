"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/types";

/**
 * Fires a toast whenever a useActionState result changes and carries a
 * top-level `error` or `message` (field-level errors stay inline via
 * FormField — this is only for the "wrong password" / "check your email"
 * class of feedback that isn't tied to one input).
 */
export function useActionToast(state: ActionState) {
  const lastState = useRef<ActionState>(null);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;

    if (state?.error) toast.error(state.error);
    if (state?.message) toast.success(state.message);
  }, [state]);
}
