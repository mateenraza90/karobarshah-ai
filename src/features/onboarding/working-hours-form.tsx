"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/types";

const days = [["mon","Monday"],["tue","Tuesday"],["wed","Wednesday"],["thu","Thursday"],["fri","Friday"],["sat","Saturday"],["sun","Sunday"]] as const;
function Submit(){const {pending}=useFormStatus();return <Button type="submit" isLoading={pending}>Save & continue</Button>}
export function WorkingHoursForm({action,initial}:{action:(p:ActionState,f:FormData)=>Promise<ActionState>;initial:Record<string,{open?:string;close?:string;closed?:boolean}>}){const [state,formAction]=useActionState(action,null);return <form action={formAction} className="flex flex-col gap-3"><div className="overflow-x-auto rounded-md border border-mist"><table className="w-full text-sm"><thead className="bg-mist/30"><tr><th className="p-3 text-left">Day</th><th className="p-3 text-left">Closed</th><th className="p-3 text-left">Open</th><th className="p-3 text-left">Close</th></tr></thead><tbody>{days.map(([key,label])=><tr key={key} className="border-t border-mist"><td className="p-3 font-medium">{label}</td><td className="p-3"><input type="checkbox" name={`${key}Closed`} defaultChecked={initial[key]?.closed ?? (key === "sat" || key === "sun")} /></td><td className="p-3"><Input name={`${key}Open`} type="time" defaultValue={initial[key]?.open ?? "09:00"} /></td><td className="p-3"><Input name={`${key}Close`} type="time" defaultValue={initial[key]?.close ?? "17:00"} /></td></tr>)}</tbody></table></div>{state?.error&&<p role="alert" className="text-sm text-clay">{state.error}</p>}<div className="flex justify-end"><Submit/></div></form>}
