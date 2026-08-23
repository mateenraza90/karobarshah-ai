"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";
import { upsertClinic } from "@/database/clinics";
import { z } from "zod";
import type { ActionState } from "@/types";

const schema = z.object({ duration: z.coerce.number().int().positive().max(480) });
const hoursSchema = z.record(z.string(), z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), closed: z.boolean() })).refine((value) => Object.values(value).every((d) => d.closed || d.open < d.close), "Closing time must be after opening time.");
export async function saveClinicSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ duration: formData.get("duration") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { error: "You do not have permission to change clinic settings." };
  const supabase = await createClient();
  const { error } = await upsertClinic(supabase, membership.organization_id, { default_appointment_duration_minutes: parsed.data.duration });
  if (error) return { error: error.message };
  revalidatePath("/settings/clinic");
  return { message: "Clinic settings saved." };
}
export async function saveHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsedJson = Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => [day, { open: String(formData.get(`${day}Open`) ?? ""), close: String(formData.get(`${day}Close`) ?? ""), closed: formData.get(`${day}Closed`) === "on" }]));
  const parsed = hoursSchema.safeParse(parsedJson);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid working hours." };
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { error: "You do not have permission to change working hours." };
  const supabase = await createClient();
  const { error } = await upsertClinic(supabase, membership.organization_id, { working_hours: parsed.data });
  if (error) return { error: error.message };
  revalidatePath("/settings/clinic");
  return { message: "Working hours saved." };
}
