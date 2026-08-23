import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMembership } from "@/database/memberships";
import { getOrganization } from "@/database/organizations";
import { getClinic } from "@/database/clinics";
import { listDoctors } from "@/database/doctors";
import { listServices } from "@/database/services";
import { createClient } from "@/services/supabase/server";
import { BusinessForm, ClinicForm, DoctorForm, ServiceForm } from "@/features/onboarding/form";
import { finishOnboarding, saveBusiness, saveClinic, saveDoctor, saveService, saveWorkingHours } from "@/features/onboarding/actions";
import { WorkingHoursForm } from "@/features/onboarding/working-hours-form";
import { FinishForm } from "@/features/onboarding/finish-form";
import { OnboardingProgress } from "@/features/onboarding/progress";

const steps = ["Business", "Clinic", "Hours", "Doctors", "Services", "Finish"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step: raw } = await searchParams;
  const requested = Number(raw ?? "1");
  const step = Number.isInteger(requested) && requested >= 1 && requested <= 6 ? requested : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await getCurrentMembership();
  if (membership?.organization.onboarding_completed_at) redirect("/dashboard");
  if (!membership && step !== 1) redirect("/onboarding?step=1");
  const org = membership ? await getOrganization(supabase, membership.organization_id) : null;
  const clinic = membership ? await getClinic(supabase, membership.organization_id) : null;
  const doctors = membership ? await listDoctors(supabase, membership.organization_id) : [];
  const services = membership ? await listServices(supabase, membership.organization_id) : [];
  const working = (clinic?.working_hours ?? {}) as Record<string, {open?: string; close?: string; closed?: boolean}>;

  return <div className="min-h-screen bg-paper px-4 py-10 sm:px-6"><div className="mx-auto flex max-w-3xl flex-col gap-8"><div><p className="text-sm font-medium text-ledger">KarobarShah AI</p><h1 className="mt-1 font-display text-3xl font-semibold text-ink">Set up your clinic</h1><p className="mt-2 text-sm text-ink-muted">Save each step as you go. You can return to previous steps at any time.</p></div><OnboardingProgress steps={steps} current={step}/><Card><CardHeader><CardTitle>{steps[step - 1]}</CardTitle></CardHeader><CardContent>{step === 1 && <BusinessForm action={saveBusiness} initial={{name: org?.name ?? (user.user_metadata?.business_name as string ?? ""),email: org?.email ?? user.email ?? "",phone: org?.phone ?? "",address: org?.address ?? "",country: org?.country ?? "Pakistan",timezone: org?.timezone ?? "Asia/Karachi",currency: org?.currency ?? "PKR"}}/>}{step === 2 && <ClinicForm action={saveClinic} initial={clinic?.default_appointment_duration_minutes ?? 30}/>} {step === 3 && <WorkingHoursForm action={saveWorkingHours} initial={working}/>} {step === 4 && <div className="flex flex-col gap-6"><DoctorForm action={saveDoctor}/>{doctors.length > 0 && <div className="border-t border-mist pt-5"><p className="mb-3 text-sm font-medium text-ink">Added doctors</p><ul className="space-y-2">{doctors.map((d)=><li key={d.id} className="rounded-md bg-mist/30 px-3 py-2 text-sm text-ink">{d.name}{d.specialization ? ` — ${d.specialization}` : ""}</li>)}</ul></div>}</div>} {step === 5 && <div className="flex flex-col gap-6"><ServiceForm action={saveService}/>{services.length > 0 && <div className="border-t border-mist pt-5"><p className="mb-3 text-sm font-medium text-ink">Added services</p><ul className="space-y-2">{services.map((s)=><li key={s.id} className="rounded-md bg-mist/30 px-3 py-2 text-sm text-ink">{s.name} — PKR {s.price} · {s.duration_minutes} min</li>)}</ul></div>}</div>} {step === 6 && <FinishCard action={finishOnboarding} clinic={!!clinic} doctors={doctors.length} services={services.length}/>}</CardContent></Card></div></div>;
}

function FinishCard({ action, clinic, doctors, services }: {action: (p: import("@/types").ActionState, f: FormData) => Promise<import("@/types").ActionState>; clinic:boolean; doctors:number; services:number}) { return <div className="flex flex-col gap-5"><p className="text-sm text-ink-muted">Your clinic is ready when the required setup items below are complete.</p><ul className="space-y-2 text-sm">{[[clinic,"Clinic information"],[doctors > 0,"At least one doctor"],[services > 0,"At least one service"]].map(([ok,label])=><li key={String(label)} className={ok ? "text-ledger" : "text-clay"}>{ok ? "✓" : "○"} {String(label)}</li>)}</ul><FinishForm action={action}/></div> }
