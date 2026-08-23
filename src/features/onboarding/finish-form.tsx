"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/types";
export function FinishForm({action}:{action:(p:ActionState,f:FormData)=>Promise<ActionState>}){const [state,formAction]=useActionState(action,null);const {pending}=useFormStatus();return <form action={formAction} className="flex flex-col gap-4">{state?.error&&<p role="alert" className="rounded-md bg-clay/5 p-3 text-sm text-clay">{state.error}</p>}<Button type="submit" isLoading={pending}>Finish onboarding</Button></form>}
