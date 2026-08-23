"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";
import { createPatient, updatePatient, archivePatient } from "@/database/patients";
import type { ActionState } from "@/types";

const schema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.email()]),
  dateOfBirth: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  adminNotes: z.string().trim().max(5000),
  tags: z.string().trim().max(500),
});
async function authorized(write = false) {
  const m = await getCurrentMembership();
  if (!m) return null;
  if (write && !["owner", "admin", "manager", "receptionist"].includes(m.role)) return null;
  return m;
}
function parse(fd: FormData) {
  return schema.safeParse({ fullName: fd.get("fullName"), phone: fd.get("phone"), email: fd.get("email"), dateOfBirth: fd.get("dateOfBirth"), adminNotes: fd.get("adminNotes"), tags: fd.get("tags") });
}
export async function createPatientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const p = parse(fd); if (!p.success) return { fieldErrors: p.error.flatten().fieldErrors };
  const m = await authorized(true); if (!m) return { error: "You do not have permission to manage patients." };
  const s = await createClient();
  const { error } = await createPatient(s, { organization_id: m.organization_id, full_name: p.data.fullName, phone: p.data.phone || null, email: p.data.email || null, date_of_birth: p.data.dateOfBirth || null, admin_notes: p.data.adminNotes || null, tags: p.data.tags ? p.data.tags.split(",").map(v => v.trim()).filter(Boolean) : [] });
  if (error) return { error: error.message };
  revalidatePath("/patients"); return { message: "Patient created." };
}
export async function updatePatientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? ""); if (!z.uuid().safeParse(id).success) return { error: "Invalid patient." };
  const p = parse(fd); if (!p.success) return { fieldErrors: p.error.flatten().fieldErrors };
  const m = await authorized(true); if (!m) return { error: "You do not have permission to manage patients." };
  const s = await createClient(); const { error } = await updatePatient(s, m.organization_id, id, { full_name: p.data.fullName, phone: p.data.phone || null, email: p.data.email || null, date_of_birth: p.data.dateOfBirth || null, admin_notes: p.data.adminNotes || null, tags: p.data.tags ? p.data.tags.split(",").map(v => v.trim()).filter(Boolean) : [] });
  if (error) return { error: error.message }; revalidatePath("/patients"); return { message: "Patient updated." };
}
export async function archivePatientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? ""); if (!z.uuid().safeParse(id).success) return { error: "Invalid patient." };
  const m = await authorized(true); if (!m || !["owner", "admin", "manager"].includes(m.role)) return { error: "You do not have permission to archive patients." };
  const s = await createClient(); const { error } = await archivePatient(s, m.organization_id, id); if (error) return { error: error.message };
  revalidatePath("/patients"); return { message: "Patient archived." };
}
