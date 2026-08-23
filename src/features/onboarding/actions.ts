"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/services/supabase/server";
import { getCurrentMembership, fetchMembershipForUser } from "@/database/memberships";
import { markOnboardingComplete, updateOrganization } from "@/database/organizations";
import { upsertClinic } from "@/database/clinics";
import { createDoctor } from "@/database/doctors";
import { createService } from "@/database/services";
import { getCachedUser } from "@/services/supabase/get-cached-user";
import type { ActionState } from "@/types";
import { BusinessStepSchema, ClinicStepSchema, DoctorStepSchema, ServiceStepSchema, WorkingHoursSchema } from "./schemas";

function errors(result: { error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } } }) {
  return { fieldErrors: result.error.flatten().fieldErrors };
}

async function currentUser() {
  const user = await getCachedUser();
  if (!user) redirect("/login");
  return user;
}

async function currentOrg() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding?step=1");
  return membership;
}

export async function saveBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = BusinessStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errors(parsed);
  const user = await currentUser();
  const supabase = await createClient();
  const existing = await fetchMembershipForUser(user.id);

  if (existing) {
    if (!['owner', 'admin'].includes(existing.role)) return { error: "Only an owner or admin can edit business details." };
    const { error } = await updateOrganization(supabase, existing.organization_id, {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      country: parsed.data.country || null,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency.toUpperCase(),
    });
    if (error) return { error: error.message };
  } else {
    const { data: organizationId, error } = await supabase.rpc("create_organization_for_current_user", {
      organization_name: parsed.data.name,
      organization_email: parsed.data.email || user.email || "",
      organization_phone: parsed.data.phone || "",
      organization_address: parsed.data.address || "",
      organization_country: parsed.data.country || "",
      organization_timezone: parsed.data.timezone,
      organization_currency: parsed.data.currency.toUpperCase(),
    });
    if (error || !organizationId) return { error: error?.message ?? "Could not create your business." };
  }
  redirect("/onboarding?step=2");
}

export async function saveClinic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ClinicStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errors(parsed);
  const membership = await currentOrg();
  if (!['owner', 'admin'].includes(membership.role)) return { error: "You do not have permission to edit clinic settings." };
  const supabase = await createClient();
  const { error } = await upsertClinic(supabase, membership.organization_id, {
    default_appointment_duration_minutes: parsed.data.defaultAppointmentDurationMinutes,
  });
  if (error) return { error: error.message };
  redirect("/onboarding?step=3");
}

export async function saveWorkingHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = WorkingHoursSchema.safeParse(raw);
  if (!parsed.success) return errors(parsed);
  const membership = await currentOrg();
  if (!['owner', 'admin'].includes(membership.role)) return { error: "You do not have permission to edit working hours." };
  const supabase = await createClient();
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const workingHours = Object.fromEntries(days.map((day) => [day, {
    open: parsed.data[`${day}Open`],
    close: parsed.data[`${day}Close`],
    closed: parsed.data[`${day}Closed`],
  }]));
  const { error } = await upsertClinic(supabase, membership.organization_id, { working_hours: workingHours });
  if (error) return { error: error.message };
  redirect("/onboarding?step=4");
}

export async function saveDoctor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = DoctorStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errors(parsed);
  const membership = await currentOrg();
  if (!['owner', 'admin', 'manager'].includes(membership.role)) return { error: "You do not have permission to add doctors." };
  const supabase = await createClient();
  const { error } = await createDoctor(supabase, {
    organization_id: membership.organization_id,
    name: parsed.data.name,
    specialization: parsed.data.specialization || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    appointment_duration_minutes: parsed.data.appointmentDurationMinutes,
  });
  if (error) return { error: error.message };
  redirect("/onboarding?step=5");
}

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ServiceStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errors(parsed);
  const membership = await currentOrg();
  if (!['owner', 'admin', 'manager'].includes(membership.role)) return { error: "You do not have permission to add services." };
  const supabase = await createClient();
  const { error } = await createService(supabase, {
    organization_id: membership.organization_id,
    name: parsed.data.name,
    price: parsed.data.price,
    duration_minutes: parsed.data.durationMinutes,
    description: parsed.data.description || null,
  });
  if (error) return { error: error.message };
  redirect("/onboarding?step=6");
}

export async function finishOnboarding(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const membership = await currentOrg();
  if (!['owner', 'admin'].includes(membership.role)) return { error: "Only an owner or admin can complete onboarding." };
  const supabase = await createClient();
  const [clinic, doctors, services] = await Promise.all([
    supabase.from("clinics").select("id").eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("doctors").select("id").eq("organization_id", membership.organization_id).limit(1),
    supabase.from("services").select("id").eq("organization_id", membership.organization_id).limit(1),
  ]);
  if (!clinic.data) return { error: "Complete clinic information first." };
  if (!doctors.data?.length) return { error: "Add at least one doctor before finishing onboarding." };
  if (!services.data?.length) return { error: "Add at least one service before finishing onboarding." };
  const { error } = await markOnboardingComplete(supabase, membership.organization_id);
  if (error) return { error: error.message };
  redirect("/dashboard");
}
