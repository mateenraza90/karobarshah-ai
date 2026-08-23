"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/types";

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" isLoading={pending}>{children}</Button>;
}

export function FAQForm({ action, faq }: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  faq?: { id: string; question: string; answer: string; is_active: boolean };
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4 rounded-md border border-mist p-4">
      <input type="hidden" name="id" value={faq?.id ?? ""} />
      <label className="text-sm font-medium text-ink">Question<Input name="question" defaultValue={faq?.question ?? ""} required maxLength={500} className="mt-1" /></label>
      <label className="text-sm font-medium text-ink">Answer<textarea name="answer" defaultValue={faq?.answer ?? ""} required maxLength={5000} rows={4} className="mt-1 w-full rounded-md border border-mist-strong bg-paper-raised p-3 text-sm" /></label>
      <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="active" defaultChecked={faq?.is_active ?? true} /> Active</label>
      <div className="flex items-center gap-3">
        <Submit>{faq ? "Save FAQ" : "Add FAQ"}</Submit>
        {state?.error && <p role="alert" className="text-sm text-clay">{state.error}</p>}
        {state?.message && <p role="status" className="text-sm text-ledger">{state.message}</p>}
      </div>
    </form>
  );
}
