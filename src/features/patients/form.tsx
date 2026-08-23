"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/types";
function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <Button type="submit" isLoading={pending}>{label}</Button>; }
export function PatientForm({ action, initial }: { action: (p: ActionState, f: FormData) => Promise<ActionState>; initial?: { id?: string; full_name?: string; phone?: string|null; email?: string|null; date_of_birth?: string|null; admin_notes?: string|null; tags?: string[] } }) {
  const [state, formAction] = useActionState(action, null);
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2">
    {initial?.id && <input type="hidden" name="id" value={initial.id} />}
    <div><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" defaultValue={initial?.full_name ?? ""} required /></div>
    <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} /></div>
    <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} /></div>
    <div><Label htmlFor="dateOfBirth">Date of birth</Label><Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={initial?.date_of_birth ?? ""} /></div>
    <div className="sm:col-span-2"><Label htmlFor="tags">Tags</Label><Input id="tags" name="tags" defaultValue={initial?.tags?.join(", ") ?? ""} placeholder="new lead, vip" /></div>
    <div className="sm:col-span-2"><Label htmlFor="adminNotes">Notes</Label><textarea id="adminNotes" name="adminNotes" defaultValue={initial?.admin_notes ?? ""} className="min-h-24 w-full rounded-md border border-mist-strong bg-paper-raised p-3 text-sm" /></div>
    <div className="sm:col-span-2 flex items-center gap-3"><Submit label={initial?.id ? "Save patient" : "Create patient"} />{state?.error && <p role="alert" className="text-sm text-clay">{state.error}</p>}{state?.message && <p className="text-sm text-ink-muted">{state.message}</p>}</div>
  </form>;
}
