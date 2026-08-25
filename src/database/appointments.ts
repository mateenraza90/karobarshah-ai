import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listAppointments(client: Client, organizationId: string, from: string, to: string) {
  const { data, error } = await client.from("appointments").select("*").eq("organization_id", organizationId).gte("start_at", from).lt("start_at", to).order("start_at");
  return { appointments: (data ?? []) as Appointment[], error };
}

export async function getAppointment(client: Client, organizationId: string, id: string) {
  const { data, error } = await client.from("appointments").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return { appointment: data as Appointment | null, error };
}

export async function createAppointment(client: Client, input: Database["public"]["Tables"]["appointments"]["Insert"]) {
  return client.from("appointments").insert(input).select().single();
}
export async function updateAppointment(client: Client, organizationId: string, id: string, patch: Database["public"]["Tables"]["appointments"]["Update"]) {
  return client.from("appointments").update(patch).eq("organization_id", organizationId).eq("id", id).select().single();
}
export async function cancelAppointment(client: Client, organizationId: string, id: string) {
  return updateAppointment(client, organizationId, id, { status: "cancelled" });
}

export async function checkAvailability(client: Client, organizationId: string, doctorId: string, startAt: string, endAt: string, excludeAppointmentId?: string) {
  let q = client.from("appointments").select("id").eq("organization_id", organizationId).eq("doctor_id", doctorId).not("status", "in", "(cancelled,no_show)").lt("start_at", endAt).gt("end_at", startAt);
  if (excludeAppointmentId) q = q.neq("id", excludeAppointmentId);
  const { data, error } = await q.limit(1);
  return { available: !error && (data?.length ?? 0) === 0, error };
}

/**
 * An appointment's patient/doctor/service/clinic foreign keys only require
 * that the referenced row exist *somewhere* — they don't require it to
 * belong to the same organization as the appointment. Without this check,
 * a caller could reference another organization's patient/doctor/service/
 * clinic by ID (a cross-tenant IDOR) and neither the FK constraints nor
 * RLS on `appointments` itself would catch it, since that policy only
 * checks the appointment row's own organization_id. Every write path that
 * lets a caller set these four references must call this first.
 */
export async function verifyAppointmentReferences(
  client: Client,
  organizationId: string,
  refs: { patientId: string; doctorId: string; serviceId: string; clinicId: string },
): Promise<boolean> {
  const [clinic, patient, doctor, service] = await Promise.all([
    client.from("clinics").select("id").eq("id", refs.clinicId).eq("organization_id", organizationId).maybeSingle(),
    client.from("patients").select("id").eq("id", refs.patientId).eq("organization_id", organizationId).eq("is_active", true).maybeSingle(),
    client.from("doctors").select("id").eq("id", refs.doctorId).eq("organization_id", organizationId).eq("is_active", true).maybeSingle(),
    client.from("services").select("id").eq("id", refs.serviceId).eq("organization_id", organizationId).eq("is_active", true).maybeSingle(),
  ]);
  return Boolean(clinic.data && patient.data && doctor.data && service.data);
}
