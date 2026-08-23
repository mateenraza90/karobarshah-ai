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
