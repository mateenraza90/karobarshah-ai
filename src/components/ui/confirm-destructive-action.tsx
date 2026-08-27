"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionState } from "@/types";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function ConfirmSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" isLoading={pending}>
      {children}
    </Button>
  );
}

/**
 * Wraps a single destructive server action (cancel, remove, etc.) behind
 * a confirmation dialog instead of firing on a single click. `children`
 * is the hidden inputs identifying what's being acted on (e.g. an
 * appointment or invite id) — the same fields the form would otherwise
 * submit directly.
 */
export function ConfirmDestructiveAction({
  action,
  triggerLabel,
  confirmLabel,
  title,
  description,
  children,
}: {
  action: Action;
  triggerLabel: string;
  confirmLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  const [open, setOpen] = useState(false);

  // Only auto-close on a successful result — if the action returned an
  // error, the dialog stays open so the person can actually see it,
  // rather than it vanishing along with the message the moment they
  // submit. This adjusts state during render (comparing against the
  // previously-seen state) rather than in an effect, per React's
  // guidance for "state changed, react to it" — see
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.message) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {children}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Never mind
            </Button>
            <ConfirmSubmit>{confirmLabel}</ConfirmSubmit>
          </DialogFooter>
        </form>
        {state?.error && (
          <p role="alert" className="mt-3 text-sm text-clay">
            {state.error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
